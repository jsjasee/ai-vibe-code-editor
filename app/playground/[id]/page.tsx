"use client";
import { usePlayground } from "@/modules/playground/hooks/usePlayground";
import { Tooltip } from "@/components/ui/tooltip";
import { useParams } from "next/navigation";
import React, { useEffect } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "react-resizable-panels";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TemplateFileTree } from "@/modules/playground/components/playground-explorer";
import { useFileExplorer } from "@/modules/playground/hooks/useFileExplorer";
import { TemplateFile } from "@/lib/generated/prisma/client";
import { TemplateFile as TF } from "@/modules/playground/lib/path-to-json"; // why is there 2 templatefile??

function MainPlaygroundPage() {
  const { id } = useParams<{ id: string }>();

  const { playgroundData, templateData, isLoading, error, saveTemplateData } =
    usePlayground(id);

  const {
    activeFileId,
    closeAllFiles,
    openFile,
    closeFile,
    editorContent,
    openFiles,
    setTemplateData,
    setActiveFileId,
    setPlaygroundId,
    setOpenFiles,
  } = useFileExplorer(); // access our zustand store

  // Set template data when playground loads
  useEffect(() => {
    setPlaygroundId(id);
  }, [id, setPlaygroundId]);

  // Initialize zustand templateData from usePlayground only on first load
  useEffect(() => {
    if (templateData && !openFiles.length) {
      setTemplateData(templateData);
    }
  }, [templateData, setTemplateData, openFiles.length]);

  console.log("template data: ", templateData);
  console.log("playground data: ", playgroundData);

  const activeFile = openFiles.find((file) => file.id === activeFileId);
  const hasUnsavedChanges = openFiles.some((file) => file.hasUnsavedChanges); // new keyword some?

  const handleFileSelect = (file: TF) => {
    openFile(file);
  };

  return (
    // what even is tooltipprovider used for?
    <TooltipProvider>
      <>
        <TemplateFileTree
          data={templateData!}
          onFileSelect={handleFileSelect}
          selectedFile={activeFile}
          title="File Explorer"
          onAddFile={() => {}}
          onAddFolder={() => {}}
          onDeleteFile={() => {}}
          onDeleteFolder={() => {}}
          onRenameFile={() => {}}
          onRenameFolder={() => {}}
        />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-centre gap-2 border-b px-4">
            <SidebarTrigger className="m1-1">
              <Separator aria-orientation="vertical" className="mr-2 h-4" />
            </SidebarTrigger>
          </header>
          <div className="flex flex-1 items-center gap-2">
            <div className="flex flex-col flex-1">
              <h1 className="text-sm font-medium">
                {/* REMOVE THIS TITLE LATER ON AS NOT IN SCHEMA */}
                {playgroundData?.title || "Code playground"}
              </h1>
            </div>
          </div>
        </SidebarInset>
      </>
    </TooltipProvider>
  );
}

export default MainPlaygroundPage;
