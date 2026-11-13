import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabase";
import { ListingFormPage, ListingFormStatus } from "../components/listing/ListingFormPage";
import { ProductFormFields } from "../components/listing/ProductFormFields";
import { validateProduct, validImages, useListingDraft, useUnsavedChanges } from "../lib/listingEditor";
import { uploadImage } from "../lib/uploads";


function PostSale() {
  const { user, loading } = useAuth();
  if (loading) return <ListingFormStatus kind="loading">Loading…</ListingFormStatus>;
  if (!user) return <ListingFormStatus>Please log in to post a listing.</ListingFormStatus>;
  return <PostSaleForm key={user.id} ownerId={user.id} />;
}

function PostSaleForm({ ownerId }) {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [description, setDescription] = useState("");

  const [pickup, setPickup] = useState(true);
  const [shipping, setShipping] = useState(false);

  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const activeRef = useRef(false);
  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);
  const [message, setMessage] = useState("");
  const draft = {title,price,brand,category,condition,description,pickup,shipping,};
  const { ready: draftReady, clear: clearDraft } = useListingDraft("product", ownerId, draft, (saved) => {setTitle(saved.title || ""); setPrice(saved.price || ""); setBrand(saved.brand || ""); setCategory(saved.category || ""); setCondition(saved.condition || ""); setDescription(saved.description || ""); setPickup(saved.pickup !== false); setShipping(Boolean(saved.shipping));});
  
  useUnsavedChanges(Boolean(title || price || brand || category || condition || description || images.length));

  const setters = { title: setTitle, price: setPrice, brand: setBrand, category: setCategory, condition: setCondition, description: setDescription, pickup: setPickup, shipping: setShipping };
  const updateValue = (name, value) => setters[name](value);

  const handleImageUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);

    if (!validImages(selectedFiles)) {
      setMessage("Each image must be a JPEG, PNG, or WebP file no larger than 5 MB.");
      e.target.value = "";
      return;
    }

    const remainingSlots = 8 - images.length;

    if (remainingSlots <= 0) return;

    const filesToAdd = selectedFiles.slice(0, remainingSlots);

    filesToAdd.forEach((file) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        setImages((previousImages) => [
          ...previousImages,
          {
            id: crypto.randomUUID(),
            src: reader.result,
            file,
          },
        ].slice(0, 8));
      };

      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const removeImage = (id) => {
    setImages((previousImages) =>
      previousImages.filter((image) => image.id !== id)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submittingRef.current) return;
    const numericPrice = Number(price);
    const validation = validateProduct(draft) || (images.length === 0 ? "Please upload at least one image." : "");
    if (validation) { setMessage(validation); return; }
    setMessage("");
    submittingRef.current = true;
    setSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!activeRef.current) return;
      if (userError || user?.id !== ownerId) {
        console.error("Unable to verify sale owner:", userError);
        setMessage("Your session has expired. Please log in again.");
        navigate("/login?redirect=/post-sale", { replace: true });
        return;
      }

      const imageUrls = [];
      for (const image of images) {
        const { data: uploadAuth, error: uploadAuthError } = await supabase.auth.getUser();
        if (!activeRef.current) return;
        if (uploadAuthError || uploadAuth.user?.id !== ownerId) throw new Error("Your session has changed. Please log in again.");
        imageUrls.push(await uploadImage(image.file, 'products'));
      }

      const { data: currentAuth, error: currentAuthError } = await supabase.auth.getUser();
      if (!activeRef.current) return;
      if (currentAuthError || currentAuth.user?.id !== user.id) throw new Error("Your session has changed. Please log in again.");

      const { data: insertedProduct, error: insertError } = await supabase
        .from("products")
        .insert({
          user_id: user.id,
          title: title.trim(),
          price: numericPrice,
          brand: brand.trim() || null,
          category,
          condition,
          description: description.trim(),
          pickup,
          shipping,
          image_urls: imageUrls,
        })
        .select()
        .single();

      if (!activeRef.current) return;
      if (insertError) {
        console.error("Product insert failed:", insertError);
        setMessage("Unable to post your sale. Please try again.");
        return;
      }
      if (!insertedProduct?.id) throw new Error("The listing could not be confirmed.");
      clearDraft();
      window.dispatchEvent(
        new CustomEvent("yardSailorProductsUpdated", {
          detail: insertedProduct,
        })
      );
      navigate(`/products/${insertedProduct.id}`, { state: { confirmation: "Your listing was posted." } });
    } catch (error) {
      if (!activeRef.current) return;
      console.error("Unexpected error while posting sale:", error);
      setMessage("Unable to post your sale. Please try again.");
    } finally {
      submittingRef.current = false;
      if (activeRef.current) setSubmitting(false);
    }
  };

  const imageItems = images.map((image) => ({ key: image.id, src: image.src }));

  return (
    <ListingFormPage
      title="Post an Item"
      subtitle="Give your treasure a new home. Add photos and details so nearby sailors can discover it."
      onSubmit={handleSubmit}
      locked={!draftReady}
      message={message}
      submitting={submitting}
      submitLabel="Post Item"
      submittingLabel="Posting..."
      onCancel={() => navigate("/")}
    >
      <ProductFormFields
        values={draft}
        onChange={updateValue}
        images={imageItems}
        maxImages={8}
        onSelectImages={handleImageUpload}
        onRemoveImage={(index) => removeImage(images[index].id)}
      />
    </ListingFormPage>
  );
}

export default PostSale;
