import { checkForNotification, expect, test } from "../test-setup";

const copyDestLabel = (page: import("@playwright/test").Page) =>
  page.locator('div[aria-label="copy-prompt"] .move-copy-path-picker');

/** Matches `_docker/src/general/backend/server-config.yaml` source name. */
const GENERAL_COPY_SOURCE = "playwright + files";

for (const modifier of ['ctrlKey', 'metaKey']) {
  test(`listing selection preserves ${modifier} clicks without keydown`, async({ page, checkForErrors }) => {
    await page.goto("/files/");
    await expect(page).toHaveTitle("Graham's Filebrowser - Files - playwright-files");
    const first = page.locator('a[aria-label="file.tar.gz"]');
    const second = page.locator('a[aria-label="myfolder"]');
    const third = page.locator('a[aria-label="copyme.txt"]');
    const selected = page.locator('.listing-item[aria-selected="true"]');

    // Start on a child so the window click handler records the selection array.
    await first.locator('.name span').click();
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(selected).toHaveCount(1);

    // dispatchEvent sends a bubbling MouseEvent without synthesizing keydown.
    await second.locator('.name span').dispatchEvent('click', { button: 0, bubbles: true, [modifier]: true });
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(second).toHaveAttribute('aria-selected', 'true');
    await expect(selected).toHaveCount(2);
    await expect(page.locator('#status-bar .status-info .button')).toHaveText('2');

    await third.locator('.image-preview').first().dispatchEvent('click', { button: 0, bubbles: true, [modifier]: true });
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(second).toHaveAttribute('aria-selected', 'true');
    await expect(third).toHaveAttribute('aria-selected', 'true');
    await expect(selected).toHaveCount(3);
    await expect(page.locator('#status-bar .status-info .button')).toHaveText('3');
    checkForErrors();
  });
}

test("listing selection toggles Control clicks and clears after release", async({ page, checkForErrors }) => {
  await page.goto("/files/");
  await expect(page).toHaveTitle("Graham's Filebrowser - Files - playwright-files");
  const first = page.locator('a[aria-label="file.tar.gz"]');
  const second = page.locator('a[aria-label="myfolder"]');
  const third = page.locator('a[aria-label="copyme.txt"]');
  const replacement = page.locator('a[aria-label="1file1.txt"]');
  const selected = page.locator('.listing-item[aria-selected="true"]');

  await first.locator('.name span').click();
  await page.keyboard.down('Control');
  try {
    await second.locator('.name span').click();
    await third.click({ position: { x: 1, y: 1 } });
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(second).toHaveAttribute('aria-selected', 'true');
    await expect(third).toHaveAttribute('aria-selected', 'true');
    await expect(selected).toHaveCount(3);

    // ListingItem treats repeat clicks within 500 ms as opening the item.
    await page.waitForTimeout(550);
    await second.locator('.name span').click();
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(second).toHaveAttribute('aria-selected', 'false');
    await expect(third).toHaveAttribute('aria-selected', 'true');
    await expect(selected).toHaveCount(2);
  } finally {
    await page.keyboard.up('Control');
  }

  await replacement.locator('.name span').click();
  await expect(replacement).toHaveAttribute('aria-selected', 'true');
  await expect(first).toHaveAttribute('aria-selected', 'false');
  await expect(third).toHaveAttribute('aria-selected', 'false');
  await expect(selected).toHaveCount(1);

  // Target the background directly, independent of the current row layout.
  await page.locator('.listing-view-root').dispatchEvent('click', { button: 0, bubbles: true });
  await expect(selected).toHaveCount(0);
  checkForErrors();
});

test("listing selection preserves Shift ranges", async({ page, checkForErrors }) => {
  await page.goto("/files/");
  await expect(page).toHaveTitle("Graham's Filebrowser - Files - playwright-files");
  const folders = page.locator('.folder-items .listing-item');
  await expect(folders.nth(2)).toBeVisible();
  await folders.nth(0).locator('.name span').click();
  await folders.nth(2).locator('.name span').click({ modifiers: ['Shift'] });
  await expect(folders.nth(0)).toHaveAttribute('aria-selected', 'true');
  await expect(folders.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(folders.nth(2)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.listing-item[aria-selected="true"]')).toHaveCount(3);
  checkForErrors();
});

test("info from listing", async({ page, checkForErrors }) => {
  await page.goto("/files/");
  await expect(page).toHaveTitle("Graham's Filebrowser - Files - playwright-files");
  await page.locator('a[aria-label="file.tar.gz"]').waitFor({ state: 'visible' });
  await page.locator('a[aria-label="file.tar.gz"]').click( { button: "right" });
  await page.locator('.selected-count-header').waitFor({ state: 'visible' });
  await expect(page.locator('.selected-count-header')).toHaveText('1');
  await page.locator('button[aria-label="Info"]').click();
  await expect(page.locator('span[aria-label="info display name"]')).toHaveText('file.tar.gz');
  checkForErrors();
});

test("info from search", async({ page, checkForErrors }) => {
  await page.goto("/files/");
  await expect(page).toHaveTitle("Graham's Filebrowser - Files - playwright-files");
  await page.locator('#search-bar-input').click()
  await page.locator('#search-input').fill('file.tar.gz');
  await expect(page.locator('#result-list')).toHaveCount(1);
  await page.locator('li[aria-label="file.tar.gz"]').click({ button: "right" });
  await page.locator('button[aria-label="Info"]').click();
  await expect(page.locator('span[aria-label="info display name"]')).toHaveText('file.tar.gz');
  checkForErrors();
})

test("open from search", async({ page, checkForErrors }) => {
  await page.goto("/files/");
  await expect(page).toHaveTitle("Graham's Filebrowser - Files - playwright-files");
  await page.locator('#search-bar-input').click()
  await page.locator('#search-input').fill('file.tar.gz');
  await expect(page.locator('#result-list')).toHaveCount(1);
  await page.locator('li[aria-label="file.tar.gz"]').click();
  await expect(page).toHaveTitle("Graham's Filebrowser - Files - file.tar.gz");
  await expect(page.locator('#previewer')).toContainText('Preview is not available for this file.');
  checkForErrors();
})

test("open nested file in /files dir from search", async({ page, checkForErrors }) => {
  await page.goto("/files/");
  await expect(page).toHaveTitle("Graham's Filebrowser - Files - playwright-files");
  await page.locator('#search-bar-input').click()
  await page.locator('#search-input').fill('binary');
  await expect(page.locator('#result-list')).toHaveCount(1);
  await page.locator('li[aria-label="binary.dat"]').click();
  await expect(page).toHaveTitle("Graham's Filebrowser - Files - binary.dat");
  await expect(page.locator('#previewer')).toContainText('Preview is not available for this file.');
  checkForErrors();
})

test("open markdown file from search", async({ page, checkForErrors }) => {
  await page.goto("/files/");
  await expect(page).toHaveTitle("Graham's Filebrowser - Files - playwright-files");
  await page.locator('#search-bar-input').click()
  await page.locator('#search-input').fill('for testing');
  await expect(page.locator('#result-list')).toHaveCount(1);
  await page.locator('li[aria-label="for testing.md"]').click();
  await expect(page).toHaveTitle("Graham's Filebrowser - Files - for testing.md");
  await expect(page.locator('#markedown-viewer')).toContainText('this is a test');
  checkForErrors();
})

test("2x copy from listing to new folder", async({ page, checkForErrors }) => {
  await page.goto("/files/");
  await expect(page).toHaveTitle("Graham's Filebrowser - Files - playwright-files");
  await page.locator('a[aria-label="copyme.txt"]').waitFor({ state: 'visible' });
  await page.locator('a[aria-label="copyme.txt"]').click( { button: "right" });
  await page.locator('.selected-count-header').waitFor({ state: 'visible' });
  await expect(page.locator('.selected-count-header')).toHaveText('1');
  await page.locator('button[aria-label="Copy file"]').click();
  await expect(copyDestLabel(page)).toHaveText(`/ (${GENERAL_COPY_SOURCE})`);
  await expect(page.locator('div[aria-label="copy-prompt"] .listing-item[aria-selected="true"]')).toHaveCount(0);
  await page.locator('div[aria-label="copy-prompt"] .listing-item[aria-label="myfolder"]').click();
  await expect(page.locator('div[aria-label="copy-prompt"] .listing-item[aria-selected="true"]')).toHaveCount(1);
  await page.locator('button[aria-label="Copy"]').click();
  await checkForNotification(page, "Files copied successfully!");
  await page.goto("/files/playwright%20%2B%20files/myfolder/");
  await expect(page).toHaveTitle("Graham's Filebrowser - Files - myfolder");
  // verify exists and copy again
  await page.locator('a[aria-label="copyme.txt"]').waitFor({ state: 'visible' });

  // create new directory
  // Ensure .listing-items is visible
  await page.locator('.listing-items').click({ button: "right" });
  await page.locator('button[aria-label="New folder"]').waitFor({ state: 'visible' });
  await page.locator('button[aria-label="New folder"]').click();
  await page.locator('input[aria-label="New Folder Name"]').waitFor({ state: 'visible' });
  await page.locator('input[aria-label="New Folder Name"]').fill('newfolder');
  await page.locator('button[aria-label="Create"]').click();
  // Wait for notification and click "Go to item" button
  await page.locator('.notification-buttons .button').waitFor({ state: 'visible' });
  await page.locator('.notification-buttons .button').click();
  await expect(page).toHaveTitle(/.* - newfolder/);
  await page.goBack();
  await expect(page).toHaveTitle(/.* - myfolder/);

  await page.locator('a[aria-label="copyme.txt"]').click( { button: "right" });
  await page.locator('.selected-count-header').waitFor({ state: 'visible' });
  await expect(page.locator('.selected-count-header')).toHaveText('1');
  await page.locator('button[aria-label="Copy file"]').click();
  await expect(copyDestLabel(page)).toHaveText(`/myfolder/ (${GENERAL_COPY_SOURCE})`);
  await page.locator('div[aria-label="copy-prompt"] .listing-item[aria-label="newfolder"]').click();
  await page.locator('button[aria-label="Copy"]').click();
  await checkForNotification(page, "Files copied successfully!");
  await page.goto("/files/playwright%20%2B%20files/myfolder/newfolder/");
  await expect(page).toHaveTitle(/.* - newfolder/);
  checkForErrors();
})

test("copy 'text-files' to 'folder#hash' verify folder size is updated", async({ page, checkForErrors }) => {
  await page.goto("/files/");
  await expect(page).toHaveTitle("Graham's Filebrowser - Files - playwright-files");
  
  // Find folder#hash and get its size before copy
  await page.locator('a[aria-label="folder#hash"]').waitFor({ state: 'visible' });
  const folderHashLink = page.locator('a[aria-label="folder#hash"]');
  const textFilesLink = page.locator('a[aria-label="text-files"]');
  const textFilesSizeBefore = await textFilesLink.locator('.size').textContent();
  const folderHashSizeBefore = await folderHashLink.locator('.size').textContent();
  
  // Copy myfotext-filesder
  await textFilesLink.click({ button: "right" });
  await page.locator('.selected-count-header').waitFor({ state: 'visible' });
  await expect(page.locator('.selected-count-header')).toHaveText('1');
  await page.locator('button[aria-label="Copy file"]').click();
  await expect(copyDestLabel(page)).toHaveText(`/ (${GENERAL_COPY_SOURCE})`);
  await page.locator('div[aria-label="copy-prompt"] .listing-item[aria-label="folder#hash"]').click();
  await page.locator('button[aria-label="Copy"]').click();
  await checkForNotification(page, "Files copied successfully!");
  await page.locator('.notification-buttons .button').waitFor({ state: 'visible' });
  await page.locator('.notification-buttons .button').click();

  // verify folder size is updated
  const folderSizeAfter = await textFilesLink.locator('.size').textContent();
  expect(folderSizeAfter).not.toBe("0.0 bytes");
  expect(folderSizeAfter).toBe(textFilesSizeBefore);

  // Go back to root and verify the copied folder has a non-zero size
  await page.goto("/files/");
  await page.locator('a[aria-label="folder#hash"]').waitFor({ state: 'visible' });
  const copiedFolderSize = await page.locator('a[aria-label="folder#hash"]').locator('.size').textContent();
  expect(copiedFolderSize).not.toBe("0.0 bytes");
  expect(copiedFolderSize).not.toBe(folderHashSizeBefore);
  checkForErrors();
})

test("delete file", async({ page, checkForErrors }) => {
  await page.goto("/files/");
  await expect(page).toHaveTitle("Graham's Filebrowser - Files - playwright-files");
  await page.locator('a[aria-label="deleteme.txt"]').waitFor({ state: 'visible' });
  await page.locator('a[aria-label="deleteme.txt"]').click({ button: "right" });
  await page.locator('.selected-count-header').waitFor({ state: 'visible' });
  await expect(page.locator('.selected-count-header')).toHaveText('1');
  await page.locator('button[aria-label="Delete"]').click();
  await expect( page.locator('.card-content')).toContainText('/deleteme.txt');
  await page.locator('button[aria-label="Confirm-Delete"]').click();
  await checkForNotification(page, "Deleted successfully!");
  checkForErrors();
})

test("delete nested file prompt", async({ page, checkForErrors }) => {
  await page.goto("/files/playwright%20%2B%20files/folder%23hash/");
  await expect(page).toHaveTitle("Graham's Filebrowser - Files - folder#hash");
  await page.locator('a[aria-label="file#.sh"]').waitFor({ state: 'visible' });
  await page.locator('a[aria-label="file#.sh"]').click({ button: "right" });
  await page.locator('.selected-count-header').waitFor({ state: 'visible' });
  await expect(page.locator('.selected-count-header')).toHaveText('1');
  await page.locator('button[aria-label="Delete"]').click();
  await expect(page.locator('.card-content')).toContainText('/folder#hash/file#.sh');
  checkForErrors();
})
