import { useRef, useState } from "react";
import { policies } from "../constants/policies.js";

export default function usePolicyTabs() {
  const [activeIndex, setActiveIndex] = useState(0);

  const tabRefs = useRef([]);

  function handleTabKeyDown(event, index) {
    let nextIndex;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = (index + 1) % policies.length;
        break;
      case "ArrowLeft":
        nextIndex = (index - 1 + policies.length) % policies.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = policies.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    setActiveIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  }

  function selectTab(index) {
    setActiveIndex(index);
  }

  return { activeIndex, selectTab, tabRefs, handleTabKeyDown };
}
