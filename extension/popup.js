async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function extractFromContent(details) {
  const docTitle = details.title || document.title || '';
  const title = (document.querySelector('meta[name="citation_title"]')?.content)
    || (document.querySelector('meta[property="og:title"]')?.content)
    || (document.querySelector('meta[name="DC.title"]')?.content)
    || docTitle;

  const authorMeta = Array.from(document.querySelectorAll('meta[name="citation_author"]'))
    .map(el => el.content)
    .filter(Boolean);
  const authors = authorMeta.join(', ');

  const doi = (document.querySelector('meta[name="citation_doi"]')?.content)
    || (document.querySelector('meta[name="dc.identifier"]')?.content?.match(/10\.\S+/)?.[0])
    || '';

  const pdfUrl = (document.querySelector('meta[name="citation_pdf_url"]')?.content) || '';

  return { title, authors, doi, pdfUrl };
}

async function main() {
  const status = document.getElementById('status');
  const titleInput = document.getElementById('title');
  const authorsInput = document.getElementById('authors');
  const saveBtn = document.getElementById('save');

  const appBase = 'http://localhost:3001'; // adjust if needed

  try {
    const tab = await getActiveTab();

    const details = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractFromContent,
      args: [{}],
    });

    const scraped = details?.[0]?.result || {};
    titleInput.value = scraped.title || tab.title || '';
    authorsInput.value = scraped.authors || '';
    status.textContent = 'Ready to save';

    saveBtn.onclick = async () => {
      const params = new URLSearchParams();
      const importUrl = `${appBase}/import`;

      if (titleInput.value) params.set('title', titleInput.value);
      if (authorsInput.value) params.set('authors', authorsInput.value);

      // Always save into default inbox
      params.set('projectName', 'Extension Inbox');
      params.set('folderName', 'Quick Saves');

      if (scraped.doi) params.set('doi', scraped.doi);
      if (scraped.pdfUrl) params.set('pdfUrl', scraped.pdfUrl);
      if (tab.url) params.set('url', tab.url);

      await chrome.tabs.create({ url: `${importUrl}?${params.toString()}` });
      window.close();
    };
  } catch (e) {
    status.textContent = 'Failed to parse this page';
  }
}

main();
