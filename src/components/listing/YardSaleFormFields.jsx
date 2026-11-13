import { FormGrid, FormSection } from "../layout/FormLayout";
import { Field } from "../ui/Field";
import { TextArea } from "../ui/TextArea";
import { TextInput } from "../ui/TextInput";
import { ImageUploader } from "./ImageUploader";

/**
 * Field groups shared by Post Yard Sale and Edit Yard Sale. Presentation only.
 * `values`: { title, description, address, startTime, endTime } (datetime-local strings)
 * `onChange(name, value)` uses those same keys; image props are passed to ImageUploader.
 */
export function YardSaleFormFields({ values, onChange, images, maxImages = 8, onSelectImages, onRemoveImage }) {
  const text = (name) => (event) => onChange(name, event.target.value);
  const title = values.title || "";
  const description = values.description || "";
  return (
    <>
      <FormSection
        title="Photos"
        aside={`${images.length}/${maxImages}`}
        description={`Add up to ${maxImages} photos. Your first photo is the cover image.`}
      >
        <ImageUploader images={images} max={maxImages} onSelect={onSelectImages} onRemove={onRemoveImage} />
      </FormSection>

      <FormSection title="Details" description="Tell visitors what kind of sale it is and what they can find.">
        <Field label="Title" required count={title.length} max={80}>
          <TextInput id="yard-sale-title" name="title" value={title} maxLength={80} onChange={text("title")} placeholder="Neighborhood garage sale" />
        </Field>
        <Field label="Description" required count={description.length} max={1000}>
          <TextArea
            id="yard-sale-description"
            name="description"
            value={description}
            maxLength={1000}
            onChange={text("description")}
            placeholder="Tell visitors what they can find..."
          />
        </Field>
      </FormSection>

      <FormSection title="Where and when" description="Times use your device’s time zone. Sales are shown until the end time, and the status updates automatically.">
        <Field label="Yard sale address" required hint="The address will be converted into a map location.">
          <TextInput
            id="yard-sale-address"
            name="address"
            value={values.address || ""}
            maxLength={500}
            onChange={text("address")}
            autoComplete="street-address"
            placeholder="123 Main St, Santa Cruz, CA 95060"
          />
        </Field>
        <FormGrid>
          <Field label="Start" required>
            <TextInput id="yard-sale-start" name="startTime" type="datetime-local" value={values.startTime || ""} onChange={text("startTime")} />
          </Field>
          <Field label="End" required>
            <TextInput id="yard-sale-end" name="endTime" type="datetime-local" value={values.endTime || ""} onChange={text("endTime")} />
          </Field>
        </FormGrid>
      </FormSection>
    </>
  );
}
