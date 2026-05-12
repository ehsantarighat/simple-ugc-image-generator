import { PageHeader } from "@/components/shared/page-header";
import { ModelForm } from "@/components/models/model-form";

export default function NewModelPage() {
  return (
    <>
      <PageHeader
        title="Add a model"
        description="Upload 3 or more clear reference photos. Front, three-quarter, and side angles work best."
      />
      <div className="max-w-2xl">
        <ModelForm mode="create" />
      </div>
    </>
  );
}
