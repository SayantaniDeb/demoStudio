const status = document.querySelector('#status');
chrome.storage.session.get(['target', 'targetLabel']).then(({ targetLabel }) => {
  if (targetLabel) status.textContent = `Selected webpage: ${targetLabel}`;
});
document.querySelector('#arm').onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https?:/.test(tab.url)) {
    status.textContent = 'Open a regular website tab first, then open this extension there.';
    return;
  }
  if (
    /^http:\/\/(127\.0\.0\.1|localhost):5173(?:\/|$)/.test(tab.url) &&
    new URL(tab.url).pathname !== '/cursor-test.html'
  ) {
    status.textContent =
      'This is Frame. Open the website you want to record in another tab, then select that tab here.';
    return;
  }
  const targetLabel = new URL(tab.url).hostname;
  await chrome.storage.session.set({ target: tab.id, targetLabel });
  status.textContent = `Selected webpage: ${targetLabel}. Return to Frame and share this same tab using the Chrome Tab option.`;
};
