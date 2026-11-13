import { Package, Truck } from "lucide-react";
import { FormGrid, FormSection } from "../layout/FormLayout";
import { CategorySelect } from "../ui/CategorySelect";
import { ChoiceCard } from "../ui/ChoiceCard";
import { ConditionSelect } from "../ui/ConditionSelect";
import { Field } from "../ui/Field";
import { PriceInput } from "../ui/PriceInput";
import { TextArea } from "../ui/TextArea";
import { TextInput } from "../ui/TextInput";
import { ImageUploader } from "./ImageUploader";

/**
 * Field groups shared by Post Item and Edit Product. Presentation only.
 * `values`: { title, price, brand, category, condition, description, pickup, shipping }
 * `onChange(name, value)` for every field; image props are passed to ImageUploader.
 */
export function ProductFormFields({ values, onChange, images, maxImages = 8, onSelectImages, onRemoveImage }) {
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

      <FormSection title="Details" description="A clear title and description help buyers find your item.">
        <Field label="Title" required count={title.length} max={70}>
          <TextInput id="product-title" name="title" value={title} maxLength={70} onChange={text("title")} placeholder="What are you selling?" />
        </Field>
        <Field label="Description" required count={description.length} max={500}>
          <TextArea
            id="product-description"
            name="description"
            value={description}
            maxLength={500}
            onChange={text("description")}
            placeholder="Tell buyers about the item, condition, size, or anything else they should know..."
          />
        </Field>
        <FormGrid>
          <Field label="Price" required>
            <PriceInput id="product-price" name="price" value={values.price ?? ""} onChange={text("price")} />
          </Field>
          <Field label="Brand">
            <TextInput id="product-brand" name="brand" value={values.brand || ""} maxLength={100} onChange={text("brand")} placeholder="Optional" />
          </Field>
          <Field label="Category" required>
            <CategorySelect id="product-category" name="category" value={values.category || ""} onChange={text("category")} />
          </Field>
          <Field label="Condition" required>
            <ConditionSelect id="product-condition" name="condition" value={values.condition || ""} onChange={text("condition")} />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="How can buyers get it?" description="Choose pickup, shipping, or both.">
        <div role="group" aria-label="Delivery options">
          <FormGrid>
            <ChoiceCard
              name="pickup"
              icon={<Package size={22} />}
              title="Local pickup"
              description="Buyer picks it up from you"
              checked={Boolean(values.pickup)}
              onChange={(event) => onChange("pickup", event.target.checked)}
            />
            <ChoiceCard
              name="shipping"
              icon={<Truck size={22} />}
              title="Shipping"
              description="Ship the item to the buyer"
              checked={Boolean(values.shipping)}
              onChange={(event) => onChange("shipping", event.target.checked)}
            />
          </FormGrid>
        </div>
      </FormSection>
    </>
  );
}
