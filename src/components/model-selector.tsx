import {
  ComboBox,
  ComboBoxContent,
  ComboBoxInput,
  ComboBoxItem,
  ComboBoxSection,
} from "@/components/ui/combo-box";
import { useModelStore } from "@/stores";

export function ModelSelector() {
  const { providerGroups, selectedModel, setSelectedModel, isLoading } = useModelStore();

  const allModels = providerGroups.flatMap((g) => g.models);

  return (
    <ComboBox
      selectedKey={selectedModel?.id ?? null}
      onSelectionChange={(key) => {
        const model = allModels.find((m) => m.id === key);
        setSelectedModel(model || null);
      }}
      aria-label="Select model"
      isDisabled={isLoading}
    >
      <ComboBoxInput
        placeholder={isLoading ? "Loading..." : (selectedModel?.name || "Select model...")}
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
