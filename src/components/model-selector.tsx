import { useEffect, useState } from "react";
import {
  ComboBox,
  ComboBoxContent,
  ComboBoxInput,
  ComboBoxItem,
  ComboBoxSection,
} from "@/components/ui/combo-box";

interface ProviderModel {
  id: string;
  name: string;
  providerID: string;
}

interface Provider {
  id: string;
  name: string;
  models: Record<string, ProviderModel>;
}

interface ConfigProvidersResponse {
  providers: Provider[];
}

export interface ModelOption {
  id: string;
  modelId: string;
  providerId: string;
  name: string;
  providerName: string;
}

interface ProviderGroup {
  id: string;
  name: string;
  models: ModelOption[];
}

interface ModelSelectorProps {
  port: number;
  value: ModelOption | null;
  onChange: (model: ModelOption | null) => void;
}

export function ModelSelector({ port, value, onChange }: ModelSelectorProps) {
  const [providerGroups, setProviderGroups] = useState<ProviderGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!port) return;

    setIsLoading(true);
    fetch(`http://127.0.0.1:${port}/config/providers`)
      .then((res) => res.json())
      .then((data: ConfigProvidersResponse) => {
        const groups: ProviderGroup[] = [];
        let firstModel: ModelOption | null = null;

        for (const provider of data.providers || []) {
          if (provider.models && Object.keys(provider.models).length > 0) {
            const models: ModelOption[] = [];
            for (const [modelId, model] of Object.entries(provider.models)) {
              const modelOption: ModelOption = {
                id: `${provider.id}/${modelId}`,
                modelId,
                providerId: provider.id,
                name: model.name,
                providerName: provider.name,
              };
              models.push(modelOption);
              if (!firstModel) firstModel = modelOption;
            }
            groups.push({
              id: provider.id,
              name: provider.name,
              models,
            });
          }
        }

        setProviderGroups(groups);
        if (firstModel && !value) {
          onChange(firstModel);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch models:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [port]);

  const allModels = providerGroups.flatMap((g) => g.models);

  return (
    <ComboBox
      selectedKey={value?.id ?? null}
      onSelectionChange={(key) => {
        const model = allModels.find((m) => m.id === key);
        onChange(model || null);
      }}
      aria-label="Select model"
      isDisabled={isLoading}
    >
      <ComboBoxInput
        placeholder={isLoading ? "Loading..." : (value?.name || "Select model...")}
        className="w-56 h-8 text-xs"
      />
      <ComboBoxContent items={providerGroups}>
        {(provider) => (
          <ComboBoxSection title={provider.name} items={provider.models}>
            {(model) => (
              <ComboBoxItem id={model.id} textValue={model.name}>
                {model.name}
              </ComboBoxItem>
            )}
          </ComboBoxSection>
        )}
      </ComboBoxContent>
    </ComboBox>
  );
}
