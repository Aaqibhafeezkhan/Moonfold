// Behaviour for the docs and blog pages: the blog's topic tabs and search, and the docs filters.
// Every page works without it; this only narrows what is already on the page.

const norm = (text) => text.trim().toLowerCase();

function initBlog() {
  const items = [...document.querySelectorAll("[data-post]")];
  if (!items.length) return;
  const tabs = [...document.querySelectorAll(".tab")];
  const search = document.querySelector("[data-blog-search]");
  const count = document.querySelector("[data-blog-count]");
  const empty = document.querySelector("[data-blog-empty]");
  const featured = document.querySelector("[data-blog-featured]");
  const latest = document.querySelector("[data-blog-latest]");
  let category = "all";

  const apply = () => {
    const query = norm(search?.value ?? "");
    let shown = 0;
    for (const item of items) {
      const match =
        (category === "all" || item.dataset.cat === category) &&
        (!query || item.dataset.text.includes(query));
      item.hidden = !match;
      if (match) shown++;
    }
    if (count) count.textContent = String(shown);
    if (empty) empty.hidden = shown > 0;
    // the featured and latest bands only make sense for the unfiltered view
    const filtered = category !== "all" || query !== "";
    if (featured) featured.hidden = filtered;
    if (latest) latest.hidden = filtered;
  };

  const select = (next) => {
    category = next;
    for (const tab of tabs) tab.setAttribute("aria-pressed", String(tab.dataset.cat === next));
    apply();
  };

  for (const tab of tabs) tab.addEventListener("click", () => select(tab.dataset.cat));
  search?.addEventListener("input", apply);

  // /blog/#handoff opens with that topic selected
  const fromHash = location.hash.slice(1);
  if (fromHash && tabs.some((tab) => tab.dataset.cat === fromHash)) select(fromHash);
}

function initDocs() {
  const side = document.querySelector("[data-doc-filter]");
  const home = document.querySelector("[data-doc-search]");
  const input = side ?? home;
  if (!input) return;
  const links = side
    ? [...document.querySelectorAll(".doc-nav-group li")]
    : [...document.querySelectorAll("[data-doc-card]")];
  const empty = document.querySelector("[data-doc-empty]");
  input.addEventListener("input", () => {
    const query = norm(input.value);
    let shown = 0;
    for (const li of links) {
      const match = !query || norm(li.textContent).includes(query);
      li.hidden = !match;
      if (match) shown++;
    }
    for (const group of document.querySelectorAll(".doc-nav-group, .doc-group")) {
      group.hidden = ![...group.querySelectorAll("li")].some((li) => !li.hidden);
    }
    if (empty) empty.hidden = shown > 0;
  });
}

// The docs menu is open in the markup so it works without script; on a phone it starts folded.
function foldDocsMenuOnPhones() {
  const menu = document.querySelector("details.doc-nav-mobile");
  const phone = window.matchMedia("(max-width: 820px)");
  if (!menu || !document.body.classList.contains("page-docs")) return;
  const sync = () => (menu.open = !phone.matches);
  sync();
  phone.addEventListener("change", sync);
}

initBlog();
initDocs();
foldDocsMenuOnPhones();
