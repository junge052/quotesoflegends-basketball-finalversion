import Lenis from "./vendor/lenis.mjs";

const nativeScroll = matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)");
const supportsOpenSelect = CSS.supports("selector(select:open)");
let lenis;
let pageScrollLocked = false;

function updateScrolling() {
  if (nativeScroll.matches) {
    lenis?.destroy();
    lenis = undefined;
  } else if (!lenis) {
    lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      autoRaf: true,
      virtualScroll: ({ event, deltaX, deltaY }) => {
        lenis.options.lerp = document.getElementById("chronology").hidden ? 0.085 : 0.16;
        if (supportsOpenSelect && document.querySelector("select:open")) {
          if (lenis?.isScrolling === "smooth") lenis.reset();
          return false;
        }
        return !(event.shiftKey || Math.abs(deltaX) > Math.abs(deltaY));
      }
    });
    if (pageScrollLocked) lenis.stop();
  }
}

nativeScroll.addEventListener("change", updateScrolling);
updateScrolling();

export function refreshScroll() {
  lenis?.resize();
}

export function jumpTo(target, block = "start") {
  if (target) target.scrollIntoView({block});
  else window.scrollTo(0, 0);
  // Route changes can resize the document and move its native scroll position.
  refreshScroll();
  lenis?.reset();
}

export function setPageScrollLocked(locked) {
  if (pageScrollLocked === locked) return;
  pageScrollLocked = locked;
  if (locked) {
    jumpTo(null);
    document.documentElement.classList.add("quote-scroll-locked");
    lenis?.stop();
  } else {
    document.documentElement.classList.remove("quote-scroll-locked");
    lenis?.start();
  }
  refreshScroll();
}
