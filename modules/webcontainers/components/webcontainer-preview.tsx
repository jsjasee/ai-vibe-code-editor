"use client";

import React, { useEffect, useState, useRef } from "react";
import type { TemplateFolder } from "@/modules/playground/lib/path-to-json";
import { transformToWebContainerFormat } from "../hooks/transformer";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import TerminalComponent, { type TerminalRef } from "./terminal";
import {
  WebContainer,
  type Unsubscribe,
  type WebContainerProcess,
} from "@webcontainer/api";

interface WebContainerPreviewProps {
  templateData: TemplateFolder;
  serverUrl: string | null;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  refreshToken?: number;
}

function WebContainerPreview({
  templateData,
  error,
  instance,
  isLoading,
  serverUrl,
  refreshToken = 0,
}: WebContainerPreviewProps) {
  // we need to convert our file data (templatefile) to how webcontainer accept the files. the webcontainer api receives file data in another format -> so we need another utility file called transformer

  // Set up our state variables
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loadingState, setLoadingState] = useState({
    transforming: false,
    mounting: false,
    installing: false,
    starting: false, // this is like npm run dev
    ready: false, // the url like localhost:3000 to access our website
  });
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4;
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isSetupInProgress, setIsSetupInProgress] = useState(false);

  // Ref to access terminal methods
  const terminalRef = useRef<TerminalRef | null>(null);
  const serverProcessRef = useRef<WebContainerProcess | null>(null);
  const serverReadyUnsubscribeRef = useRef<Unsubscribe | null>(null);

  const resetLoadingState = () => {
    setLoadingState({
      transforming: false,
      mounting: false,
      installing: false,
      starting: false,
      ready: false,
    });
  };

  const cleanupServerReadyListener = () => {
    serverReadyUnsubscribeRef.current?.();
    serverReadyUnsubscribeRef.current = null;
  };

  const stopServerProcess = async () => {
    cleanupServerReadyListener();

    const activeProcess = serverProcessRef.current;
    if (!activeProcess) return;

    serverProcessRef.current = null;
    activeProcess.kill();

    try {
      await activeProcess.exit;
    } catch (error) {
      console.error("Failed while waiting for the server process to stop:", error);
    }
  };

  const startServer = async (container: WebContainer) => {
    setLoadingState((prev) => ({
      ...prev,
      transforming: false,
      mounting: false,
      installing: false,
      starting: true,
      ready: false,
    }));
    setCurrentStep(4);

    if (terminalRef.current?.writeToTerminal) {
      terminalRef.current.writeToTerminal(
        "🚀 Starting development server...\r\n",
      );
    }

    cleanupServerReadyListener();
    serverReadyUnsubscribeRef.current = container.on(
      "server-ready",
      (port: number, url: string) => {
        console.log(`Server ready on port ${port} at ${url}`);
        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal(`🌐 Server ready at ${url}\r\n`);
        }

        setPreviewUrl(url);
        setLoadingState((prev) => ({
          ...prev,
          starting: false,
          ready: true,
        }));
        setIsSetupComplete(true);
        setIsSetupInProgress(false);
      },
    );

    const startProcess = await container.spawn("npm", ["run", "start"]);
    serverProcessRef.current = startProcess;
    terminalRef.current?.attachProcess(startProcess);

    void startProcess.output
      .pipeTo(
        new WritableStream({
          write(data) {
            if (terminalRef.current?.writeToTerminal) {
              terminalRef.current.writeToTerminal(data);
            }
          },
        }),
      )
      .catch(() => {});

    void startProcess.exit.then((exitCode) => {
      if (serverProcessRef.current === startProcess) {
        serverProcessRef.current = null;
      }

      if (exitCode !== 0 && terminalRef.current?.writeToTerminal) {
        terminalRef.current.writeToTerminal(
          `❌ Development server stopped with exit code ${exitCode}\r\n`,
        );
      }
    });
  };

  // Reset setup state when a save asks us to rebuild the preview.
  useEffect(() => {
    async function resetPreview() {
      if (refreshToken === 0) return;

      await stopServerProcess();
      setIsSetupComplete(false);
      setIsSetupInProgress(false);
      setPreviewUrl("");
      setCurrentStep(0);
      resetLoadingState();
    }

    void resetPreview();
  }, [refreshToken]);

  useEffect(() => {
    async function setupContainer() {
      // Don't run setup if it's already complete or in progress (this is is the initial checks stage in the screenshots on notion)
      if (!instance || isSetupComplete || isSetupInProgress) return;

      try {
        setIsSetupInProgress(true);
        setSetupError(null);

        if (serverUrl) {
          setPreviewUrl(serverUrl);
          setLoadingState((prev) => ({
            ...prev,
            starting: false,
            ready: true,
          }));
          setCurrentStep(4);
          setIsSetupComplete(true);
          setIsSetupInProgress(false);
          return;
        }

        // If files are already there, we only need to boot the server again.
        try {
          const packageJsonExists = await instance.fs.readFile(
            "package.json",
            "utf8",
          );
          if (packageJsonExists) {
            if (terminalRef.current?.writeToTerminal) {
              terminalRef.current.writeToTerminal(
                "🔄 Reusing mounted project files...\r\n",
              );
            }
            await startServer(instance);
            return;
          }
        } catch (e) {
          // Files don't exist, proceed with normal setup
        }

        // Step 1: Transform data
        setLoadingState((prev) => ({ ...prev, transforming: true }));
        setCurrentStep(1);

        // Write to terminal
        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal(
            "🔄 Transforming template data...\r\n",
          );
        }

        // @ts-ignore
        const files = transformToWebContainerFormat(templateData);

        setLoadingState((prev) => ({
          ...prev,
          transforming: false, // files transforming is done, no need to do anymore
          mounting: true, // do mounting next,
        }));
        setCurrentStep(2);

        // Step 2: Mount files
        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal(
            "📁 Mounting files to WebContainer...\r\n",
          );
        }

        await instance.mount(files);

        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal(
            "✅ Files mounted successfully\r\n",
          );
        }

        setLoadingState((prev) => ({
          ...prev,
          mounting: false, // done with mounting
          installing: true, // next step, installing
        }));
        setCurrentStep(3);

        // Step 3: Install dependencies
        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal(
            "📦 Installing dependencies...\r\n",
          );
        }

        const installProcess = await instance.spawn("npm", ["install"]); // this is how to execute command in webcontainers

        // Stream install output to terminal
        void installProcess.output
          .pipeTo(
            new WritableStream({
              write(data) {
                // Write directly to terminal
                if (terminalRef.current?.writeToTerminal) {
                  terminalRef.current.writeToTerminal(data);
                }
              },
            }),
          )
          .catch(() => {});

        const installExitCode = await installProcess.exit;

        if (installExitCode !== 0) {
          throw new Error(
            `Failed to install dependencies. Exit code: ${installExitCode}`,
          );
        }

        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal(
            "✅ Dependencies installed successfully\r\n",
          );
        }

        await startServer(instance);
      } catch (err) {
        console.error("Error setting up container:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);

        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal(`❌ Error: ${errorMessage}\r\n`);
        }

        setSetupError(errorMessage);
        setIsSetupInProgress(false);
        resetLoadingState();
      }
    }

    setupContainer();
  }, [instance, templateData, isSetupComplete, isSetupInProgress, serverUrl]);

  useEffect(() => {
    return () => {
      void stopServerProcess();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-6 rounded-lg bg-gray-50 dark:bg-gray-900">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <h3 className="text-lg font-medium">Initializing WebContainer</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Setting up the environment for your project...
          </p>
        </div>
      </div>
    );
  }

  if (error || setupError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-lg max-w-md">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="h-5 w-5" />
            <h3 className="font-semibold">Error</h3>
          </div>
          <p className="text-sm">{error || setupError}</p>
        </div>
      </div>
    );
  }

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStep) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (stepIndex === currentStep) {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    } else {
      return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepText = (stepIndex: number, label: string) => {
    const isActive = stepIndex === currentStep;
    const isComplete = stepIndex < currentStep;

    return (
      <span
        className={`text-sm font-medium ${
          isComplete
            ? "text-green-600"
            : isActive
              ? "text-blue-600"
              : "text-gray-500"
        }`}
      >
        {label}
      </span>
    );
  };

  return (
    <div className="h-full w-full flex flex-col">
      {!previewUrl ? (
        <div className="h-full flex flex-col">
          <div className="w-full max-w-md p-6 m-5 rounded-lg bg-white dark:bg-zinc-800 shadow-sm mx-auto">
            <Progress
              value={(currentStep / totalSteps) * 100}
              className="h-2 mb-6"
            />

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                {getStepIcon(1)}
                {getStepText(1, "Transforming template data")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(2)}
                {getStepText(2, "Mounting files")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(3)}
                {getStepText(3, "Installing dependencies")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(4)}
                {getStepText(4, "Starting development server")}
              </div>
            </div>
          </div>

          {/* Terminal */}
          <div className="flex-1 p-4">
            <TerminalComponent
              ref={terminalRef}
              webContainerInstance={instance}
              theme="dark"
              className="h-full"
            />
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          {/* Preview */}
          <div className="flex-1">
            {/* what is an iframe???` */}
            <iframe
              src={previewUrl}
              className="w-full h-full border-none"
              title="WebContainer Preview"
            />
          </div>

          {/* Terminal at bottom when preview is ready */}
          <div className="h-64 border-t">
            <TerminalComponent
              ref={terminalRef}
              webContainerInstance={instance}
              theme="dark"
              className="h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default WebContainerPreview;
