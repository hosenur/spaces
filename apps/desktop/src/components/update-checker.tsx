import { useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalClose,
} from "@/components/ui/modal";

export function UpdateChecker() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    async function checkForUpdate() {
      try {
        const available = await check();
        if (available) {
          setUpdate(available);
          setIsModalOpen(true);
        }
      } catch (error) {
        console.error("Failed to check for updates:", error);
      }
    }

    const timeout = setTimeout(checkForUpdate, 3000);
    return () => clearTimeout(timeout);
  }, []);

  async function handleUpdate() {
    if (!update) return;

    setIsUpdating(true);
    try {
      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setDownloadProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case "Finished":
            setDownloadProgress(100);
            break;
        }
      });

      await relaunch();
    } catch (error) {
      console.error("Failed to install update:", error);
      setIsUpdating(false);
    }
  }

  if (!update) return null;

  return (
    <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>Update Available</ModalTitle>
          <ModalDescription>
            Version {update.version} is ready to install.
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <ModalClose>Later</ModalClose>
          <Button
            intent="primary"
            onPress={handleUpdate}
            isDisabled={isUpdating}
          >
            {isUpdating ? `Downloading... ${downloadProgress}%` : "Update Now"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
