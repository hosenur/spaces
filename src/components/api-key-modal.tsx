import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal";
import { useConfigStore } from "@/stores";

export function ApiKeyModal() {
  const { showApiKeyModal, setGroqApiKey, setShowApiKeyModal } = useConfigStore();
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!apiKey.trim()) return;
    setIsSubmitting(true);
    await setGroqApiKey(apiKey.trim());
    setIsSubmitting(false);
    setApiKey("");
  }

  return (
    <Modal isOpen={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>Enter Groq API Key</ModalTitle>
          <ModalDescription>
            This will be used to generate branch names for your spaces. You can get an API key from{" "}
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              console.groq.com
            </a>
          </ModalDescription>
        </ModalHeader>
        <div className="px-4 py-2">
          <label className="block text-sm font-medium mb-1.5">API Key</label>
          <Input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="gsk_..."
            type="password"
          />
        </div>
        <ModalFooter>
          <Button intent="primary" onPress={handleSubmit} isDisabled={!apiKey.trim() || isSubmitting}>
            {isSubmitting ? "Saving..." : "Save API Key"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
