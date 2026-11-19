import { useState } from "react";

export default function useRoomGallery({ images, status }) {
  const [selectedId, setSelectedId] = useState(null);

  const [failedIds, setFailedIds] = useState([]);

  function markFailed(imageId) {
    setFailedIds((previous) =>
      previous.includes(imageId) ? previous : [...previous, imageId],
    );
  }

  const selectedIndex = Math.max(
    0,
    images.findIndex((image) => image.id === selectedId),
  );

  const selected = images[selectedIndex];

  if (status === "error" || !selected)
    return { setSelectedId, failedIds, markFailed, selectedIndex, selected };

  const selectedFailed = failedIds.includes(selected.id);

  function previousImage() {
    setSelectedId(images[selectedIndex - 1].id);
  }
  function nextImage() {
    setSelectedId(images[selectedIndex + 1].id);
  }
  function selectImage(imageId) {
    setSelectedId(imageId);
  }

  return {
    previousImage,
    nextImage,
    selectImage,
    failedIds,
    markFailed,
    selectedIndex,
    selected,
    selectedFailed,
  };
}
