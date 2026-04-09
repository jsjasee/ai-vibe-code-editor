"use client";
import { usePlayground } from "@/modules/playground/hooks/usePlayground";
import { Tooltip } from "@/components/ui/tooltip";
import { useParams } from "next/navigation";
import React from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "react-resizable-panels";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TemplateFileTree } from "@/modules/playground/components/playground-explorer";

function MainPlaygroundPage() {
  const { id } = useParams<{ id: string }>();

  const { playgroundData, templateData, isLoading, error, saveTemplateData } =
    usePlayground(id);

  console.log("template data: ", templateData);
  console.log("playground data: ", playgroundData);

  const activeFile = "sample.txt";

  return (
    // what even is tooltipprovider used for?
    <TooltipProvider>
      <>
        <TemplateFileTree
          data={templateData!}
          onFileSelect={() => {}}
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
