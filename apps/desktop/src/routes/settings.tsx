import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { toast } from "sonner";
import { getAsanaAuth, setAsanaToken, disconnectAsana } from "@/lib/tauri";
import { useConfigStore } from "@/stores";
import type { AsanaAuth } from "@/types/config";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function GroqIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 201 201" className={className}>
      <path fill="#F54F35" d="M0 0h201v201H0V0Z" />
      <path
        fill="#FEFBFB"
        d="m128 49 1.895 1.52C136.336 56.288 140.602 64.49 142 73c.097 1.823.148 3.648.161 5.474l.03 3.247.012 3.482.017 3.613c.01 2.522.016 5.044.02 7.565.01 3.84.041 7.68.072 11.521.007 2.455.012 4.91.016 7.364l.038 3.457c-.033 11.717-3.373 21.83-11.475 30.547-4.552 4.23-9.148 7.372-14.891 9.73l-2.387 1.055c-9.275 3.355-20.3 2.397-29.379-1.13-5.016-2.38-9.156-5.17-13.234-8.925 3.678-4.526 7.41-8.394 12-12l3.063 2.375c5.572 3.958 11.135 5.211 17.937 4.625 6.96-1.384 12.455-4.502 17-10 4.174-6.784 4.59-12.222 4.531-20.094l.012-3.473c.003-2.414-.005-4.827-.022-7.241-.02-3.68 0-7.36.026-11.04-.003-2.353-.008-4.705-.016-7.058l.025-3.312c-.098-7.996-1.732-13.21-6.681-19.47-6.786-5.458-13.105-8.211-21.914-7.792-7.327 1.188-13.278 4.7-17.777 10.601C75.472 72.012 73.86 78.07 75 85c2.191 7.547 5.019 13.948 12 18 5.848 3.061 10.892 3.523 17.438 3.688l2.794.103c2.256.082 4.512.147 6.768.209v16c-16.682.673-29.615.654-42.852-10.848-8.28-8.296-13.338-19.55-13.71-31.277.394-9.87 3.93-17.894 9.562-25.875l1.688-2.563C84.698 35.563 110.05 34.436 128 49Z"
      />
    </svg>
  );
}

function AsanaIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 251 232" className={className}>
      <path
        fill="#F06A6A"
        d="M179.383 54.3733c0 30.0166-24.337 54.3737-54.354 54.3737-30.0355 0-54.3733-24.3382-54.3733-54.3737S94.9935 0 125.029 0c30.017 0 54.354 24.3378 54.354 54.3733ZM54.3928 122.33c-30.0166 0-54.373269 24.338-54.373269 54.355 0 30.017 24.337769 54.373 54.373269 54.373 30.0354 0 54.3732-24.338 54.3732-54.373 0-30.017-24.3378-54.355-54.3732-54.355Zm141.2532 0c-30.035 0-54.373 24.338-54.373 54.374 0 30.035 24.338 54.373 54.373 54.373 30.017 0 54.374-24.338 54.374-54.373 0-30.036-24.338-54.374-54.374-54.374Z"
      />
    </svg>
  );
}

function SettingsPage() {
  const { config, setGroqApiKey, clearGroqApiKey } = useConfigStore();
  const [asanaAuth, setAsanaAuth] = useState<AsanaAuth | null>(null);
  const [token, setToken] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAsanaModalOpen, setIsAsanaModalOpen] = useState(false);
  const [update, setUpdate] = useState<Update | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const [groqToken, setGroqToken] = useState("");
  const [isSavingGroq, setIsSavingGroq] = useState(false);
  const [isGroqModalOpen, setIsGroqModalOpen] = useState(false);

  useEffect(() => {
    loadAsanaAuth();
  }, []);

  async function loadAsanaAuth() {
    try {
      const auth = await getAsanaAuth();
      setAsanaAuth(auth);
    } catch (err) {
      console.error("Failed to load Asana auth:", err);
    }
  }

  async function handleSaveToken() {
    if (!token.trim()) return;
    setIsSaving(true);
    try {
      await setAsanaToken(token.trim());
      setAsanaAuth({ access_token: token.trim() });
      setToken("");
      setIsAsanaModalOpen(false);
      toast.success("Connected to Asana");
    } catch (err) {
      console.error("Failed to save Asana token:", err);
      toast.error(err as string);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveGroqToken() {
    if (!groqToken.trim()) return;
    setIsSavingGroq(true);
    try {
      const ok = await setGroqApiKey(groqToken.trim());
      if (ok) {
        setGroqToken("");
        setIsGroqModalOpen(false);
        toast.success("Connected to Groq");
      } else {
        toast.error("Failed to connect to Groq");
      }
    } catch (err) {
      console.error("Failed to save Groq token:", err);
      toast.error(err as string);
    } finally {
      setIsSavingGroq(false);
    }
  }

  async function handleDisconnectAsana() {
    try {
      await disconnectAsana();
      setAsanaAuth(null);
      toast.success("Disconnected from Asana");
    } catch (err) {
      console.error("Failed to disconnect from Asana:", err);
      toast.error(err as string);
    }
  }

  async function handleDisconnectGroq() {
    try {
      const ok = await clearGroqApiKey();
      if (ok) {
        toast.success("Disconnected from Groq");
      } else {
        toast.error("Failed to disconnect from Groq");
      }
    } catch (err) {
      console.error("Failed to disconnect from Groq:", err);
      toast.error(err as string);
    }
  }

  async function handleCheckForUpdates() {
    setIsCheckingUpdate(true);
    try {
      const available = await check();
      if (available) {
        setUpdate(available);
        setIsUpdateModalOpen(true);
      } else {
        toast.success("You're up to date");
      }
    } catch (err) {
      console.error("Failed to check for updates:", err);
      toast.error("Failed to check for updates");
    } finally {
      setIsCheckingUpdate(false);
    }
  }

  async function handleInstallUpdate() {
    if (!update) return;

    setIsUpdating(true);
    setDownloadProgress(0);
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
    } catch (err) {
      console.error("Failed to install update:", err);
      toast.error("Failed to install update");
      setIsUpdating(false);
    }
  }

  return (
    <div className="flex flex-col h-full p-6">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      <Tabs aria-label="Settings">
        <TabList>
          <Tab id="connections">Connections</Tab>
          <Tab id="general">General</Tab>
        </TabList>

        <TabPanel id="connections" className="pt-6">
          <div className="space-y-6">
            <div className="p-4 rounded-lg flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <AsanaIcon className="size-6 shrink-0" />
                <div>
                  <h3 className="font-medium">Asana</h3>
                  {asanaAuth ? (
                    <p className="text-sm text-muted-fg">Connected</p>
                  ) : (
                    <p className="text-sm text-muted-fg">
                      Enter your Personal Access Token to connect. Import your tasks directly from Asana to Spaces and assign them to agents.
                    </p>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {asanaAuth ? (
                  <Button intent="outline" onPress={handleDisconnectAsana}>
                    Disconnect
                  </Button>
                ) : (
                  <Modal
                    isOpen={isAsanaModalOpen}
                    onOpenChange={setIsAsanaModalOpen}
                  >
                    <Button intent="primary">Connect</Button>
                    <ModalContent>
                      <ModalHeader>
                        <ModalTitle>Connect to Asana</ModalTitle>
                        <ModalDescription>
                          Enter your Personal Access Token from Asana to connect
                          your account.
                        </ModalDescription>
                      </ModalHeader>
                      <ModalBody>
                        <Input
                          type="password"
                          placeholder="Personal Access Token"
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          className="w-full"
                        />
                      </ModalBody>
                      <ModalFooter>
                        <ModalClose>
                          <Button intent="outline">Cancel</Button>
                        </ModalClose>
                        <Button
                          intent="primary"
                          onPress={handleSaveToken}
                          isDisabled={isSaving || !token.trim()}
                        >
                          {isSaving ? "Saving..." : "Connect"}
                        </Button>
                      </ModalFooter>
                    </ModalContent>
                  </Modal>
                )}
              </div>
            </div>
            <div className="p-4 rounded-lg flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <GroqIcon className="size-6 shrink-0" />
                <div>
                  <h3 className="font-medium">Groq</h3>
                  {config?.groq_api_key ? (
                    <p className="text-sm text-muted-fg">Connected</p>
                  ) : (
                    <p className="text-sm text-muted-fg">
                      Groq is used to generate branch names for your coding sessions.
                    </p>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {config?.groq_api_key ? (
                  <Button intent="outline" onPress={handleDisconnectGroq}>
                    Disconnect
                  </Button>
                ) : (
                  <Modal
                    isOpen={isGroqModalOpen}
                    onOpenChange={setIsGroqModalOpen}
                  >
                    <Button intent="primary">Connect</Button>
                    <ModalContent>
                      <ModalHeader>
                        <ModalTitle>Connect to Groq</ModalTitle>
                        <ModalDescription>
                          Enter your API Key from Groq to connect your account.
                        </ModalDescription>
                      </ModalHeader>
                      <ModalBody>
                        <Input
                          type="password"
                          placeholder="API Key"
                          value={groqToken}
                          onChange={(e) => setGroqToken(e.target.value)}
                          className="w-full"
                        />
                      </ModalBody>
                      <ModalFooter>
                        <ModalClose>
                          <Button intent="outline">Cancel</Button>
                        </ModalClose>
                        <Button
                          intent="primary"
                          onPress={handleSaveGroqToken}
                          isDisabled={isSavingGroq || !groqToken.trim()}
                        >
                          {isSavingGroq ? "Saving..." : "Connect"}
                        </Button>
                      </ModalFooter>
                    </ModalContent>
                  </Modal>
                )}
              </div>
            </div>
          </div>
        </TabPanel>

        <TabPanel id="general" className="pt-6">
          <div className="space-y-6">
            <div className="p-4 rounded-lg flex items-center justify-between gap-4">
              <div>
                <h3 className="font-medium">Updates</h3>
                <p className="text-sm text-muted-fg">
                  Check for updates and install the latest version.
                </p>
              </div>
              <Button
                intent="outline"
                onPress={handleCheckForUpdates}
                isDisabled={isCheckingUpdate}
              >
                {isCheckingUpdate ? "Checking..." : "Check for updates"}
              </Button>
            </div>
          </div>

          <Modal isOpen={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
            <ModalContent size="sm">
              <ModalHeader>
                <ModalTitle>Update Available</ModalTitle>
                <ModalDescription>
                  {update ? `Version ${update.version} is ready to install.` : "An update is ready to install."}
                </ModalDescription>
              </ModalHeader>
              <ModalFooter>
                <ModalClose>Later</ModalClose>
                <Button
                  intent="primary"
                  onPress={handleInstallUpdate}
                  isDisabled={isUpdating}
                >
                  {isUpdating ? `Downloading... ${downloadProgress}%` : "Update Now"}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </TabPanel>
      </Tabs>
    </div>
  );
}
