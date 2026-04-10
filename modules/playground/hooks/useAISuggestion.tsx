import { useState, useRef, useCallback } from "react";

interface AISuggestionsState {
  suggestion: string | null;
  isLoading: boolean;
  position: { line: number; column: number } | null;
  decoration: string[];
  isEnabled: boolean;
}

interface UseAISuggestionsReturn extends AISuggestionsState {
  toggleEnabled: () => void;
  fetchSuggestion: (type: string, editor: any) => Promise<void>;
  acceptSuggestion: (editor: any, monaco: any) => void;
  rejectSuggestion: (editor: any) => void;
  clearSuggestion: (editor: any) => void;
}

export const useAISuggestions = (): UseAISuggestionsReturn => {
  const [state, setState] = useState<AISuggestionsState>({
    suggestion: null,
    isLoading: false,
    position: null,
    decoration: [],
    isEnabled: true,
  });
  const isFetchingRef = useRef(false);
  const isEnabledRef = useRef(true);

  const toggleEnabled = useCallback(() => {
    setState((prev) => {
      const nextEnabled = !prev.isEnabled;
      isEnabledRef.current = nextEnabled;

      return {
        ...prev,
        isEnabled: nextEnabled,
        suggestion: nextEnabled ? prev.suggestion : null,
        position: nextEnabled ? prev.position : null,
        decoration: nextEnabled ? prev.decoration : [],
        isLoading: nextEnabled ? prev.isLoading : false,
      };
    }); // what goes in the prev here? its not attached to any variable? (is it like useState?)
  }, []);

  const fetchSuggestion = useCallback(async (type: string, editor: any) => {
    if (!isEnabledRef.current || !editor || isFetchingRef.current) {
      return;
    }

    const model = editor.getModel(); // this code is related to monaco editor
    const cursorPosition = editor.getPosition();

    if (!model || !cursorPosition) {
      return;
    }

    isFetchingRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const payload = {
        fileContent: model.getValue(),
        cursorLine: cursorPosition.lineNumber - 1,
        cursorColumn: cursorPosition.column - 1,
        suggestionType: type, // in the backend we will accept these values
      };

      const response = await fetch("/api/code-completion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      // if ai send a suggestion, store the suggestion ALONG with the cursor position (this will be provided by the backend)
      const data = await response.json();

      if (!isEnabledRef.current) {
        return;
      }

      if (data.suggestion) {
        const suggestionText = data.suggestion.trim();
        setState((prev) => ({
          ...prev,
          suggestion: suggestionText,
          position: {
            line: cursorPosition.lineNumber,
            column: cursorPosition.column,
          },
        }));
      }
    } catch (error) {
      console.error("Error fetching code suggestion:", error);
    } finally {
      isFetchingRef.current = false;
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // automatically append the ai suggestion
  const acceptSuggestion = useCallback((editor: any, monaco: any) => {
    setState((currentState) => {
      if (
        !currentState.suggestion ||
        !currentState.position ||
        !editor ||
        !monaco
      ) {
        return currentState;
      }

      const { line, column } = currentState.position;
      const sanitizedSuggestion = currentState.suggestion.replace(
        /^\d+:\s*/gm,
        "",
      );

      // write the text on our editor
      editor.executeEdits("", [
        {
          range: new monaco.Range(line, column, line, column),
          text: sanitizedSuggestion,
          forceMoveMarkers: true,
        },
      ]);

      // Clear decorations
      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }

      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
      };
    });
  }, []);

  const rejectSuggestion = useCallback((editor: any) => {
    setState((currentState) => {
      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }
      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
      };
    });
  }, []);

  const clearSuggestion = useCallback((editor: any) => {
    setState((currentState) => {
      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }
      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
      };
    });
  }, []);

  return {
    ...state,
    toggleEnabled,
    fetchSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    clearSuggestion,
  };
};
