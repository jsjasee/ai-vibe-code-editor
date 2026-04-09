"use client";
import { useRef, useEffect, useCallback } from "react";
import React from "react";
import {
  configureMonaco,
  defaultEditorOptions,
  getEditorLanguage,
} from "@/modules/playground/lib/editor-config";
import type { TemplateFile } from "@/modules/playground/lib/path-to-json";
import { Editor, Monaco } from "@monaco-editor/react";

interface PlaygroundEditorProps {
  activeFile: TemplateFile | undefined;
  content: string;
  onContentChange: (value: string) => void;
}

const PlaygroundEditor = ({
  activeFile,
  content,
  onContentChange,
}: PlaygroundEditorProps) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    console.log("Editor instance mounted:", !!editorRef.current);

    editor.updateOptions({
      ...defaultEditorOptions,
      // Enable inline suggestions but with specific settings to prevent conflicts
      inlineSuggest: {
        enabled: true,
        mode: "prefix",
        suppressSuggestions: false,
      },
      // Disable some conflicting suggest features
      suggest: {
        preview: false, // Disable preview to avoid conflicts
        showInlineDetails: false,
        insertMode: "replace",
      },
      // Quick suggestions
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false,
      },
      // Smooth cursor
      cursorSmoothCaretAnimation: "on",
    });

    configureMonaco(monaco);

    updateEditorLanguage();
  };

  const updateEditorLanguage = () => {
    if (!activeFile || !monacoRef.current || !editorRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const language = getEditorLanguage(activeFile.fileExtension || ""); // set the language of the editor i guess?
    try {
      monacoRef.current.editor.setModelLanguage(model, language);
    } catch (error) {
      console.warn("Failed to set editor language:", error);
    }
  };

  useEffect(() => {
    updateEditorLanguage();
  }, [activeFile]);

  return (
    <div className="h-full relative">
      <Editor
        height={"100%"}
        value={content}
        onChange={(value) => onContentChange(value || "")}
        onMount={handleEditorDidMount}
        language={
          activeFile
            ? getEditorLanguage(activeFile.fileExtension || "")
            : "plaintext"
        }
        // @ts-ignore
        options={defaultEditorOptions}
      />
    </div>
  );
};

export default PlaygroundEditor;
