#!/usr/bin/env python3
"""
Glam AI batch video uploader.

Usage:
  python glam_uploader.py /path/to/glam_jobs      # Run batch upload
  python glam_uploader.py --login                  # First-time login setup

Reads numbered subfolders (001_*, 002_*, ...) and for each:
  1. Uploads image.jpg to Glam AI
  2. Pastes prompt.txt into the prompt field
  3. Clicks Generate
  4. Waits for generation to complete
  5. Moves to next folder
"""

import sys
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, Page, TimeoutError as PlaywrightTimeout

GLAM_URL = "https://glam.ai/generate/video"
GENERATION_TIMEOUT_SEC = 180  # 3 minutes per video
BROWSER_DATA_DIR = os.path.expanduser("~/.glam-playwright-profile")


def get_job_folders(jobs_dir: Path) -> list[Path]:
    """Get sorted subfolders matching NNN_* pattern."""
    folders = sorted(
        [d for d in jobs_dir.iterdir() if d.is_dir()],
        key=lambda d: d.name,
    )
    return folders


def upload_image(page: Page, image_path: Path):
    """Upload image.jpg via the file input."""
    file_input = page.locator('input[type="file"]').first
    file_input.set_input_files(str(image_path))
    page.wait_for_timeout(2000)


def set_prompt(page: Page, prompt_text: str):
    """Open Advanced Settings and fill in the prompt."""
    # Expand Advanced Settings if collapsed
    advanced = page.get_by_text("Advanced Settings")
    if advanced.is_visible():
        advanced.click()
        page.wait_for_timeout(500)

    # Find and fill the prompt textarea
    prompt_field = page.locator("textarea").first
    prompt_field.fill("")
    prompt_field.fill(prompt_text)
    page.wait_for_timeout(300)


def click_generate(page: Page):
    """Click the Generate button."""
    generate_btn = page.get_by_role("button", name="Generate")
    generate_btn.click()


def wait_for_completion(page: Page, timeout_sec: int = GENERATION_TIMEOUT_SEC) -> bool:
    """
    Wait for generation to complete.
    Watches the Generate button — waits for it to become disabled (started),
    then waits for it to become enabled again (finished).
    """
    # Wait a moment for the generation to start
    page.wait_for_timeout(3000)

    generate_btn = page.get_by_role("button", name="Generate")
    start = time.time()

    while time.time() - start < timeout_sec:
        try:
            if generate_btn.is_enabled():
                # Confirm it's stable (not a transient state)
                page.wait_for_timeout(2000)
                if generate_btn.is_enabled():
                    return True
        except Exception:
            pass
        page.wait_for_timeout(5000)

    print("  [WARN] Generation timed out")
    return False


def clear_previous_upload(page: Page):
    """Remove previously uploaded image before uploading the next."""
    try:
        # Look for clear/remove/X buttons near the upload area
        clear_btn = page.locator("button").filter(has_text="Clear All")
        if clear_btn.is_visible():
            clear_btn.click()
            page.wait_for_timeout(1000)
            return

        # Try the X button on the image preview
        remove_btn = page.locator('[class*="remove"], [class*="close"], [aria-label="Remove"]').first
        if remove_btn.is_visible():
            remove_btn.click()
            page.wait_for_timeout(1000)
            return
    except Exception:
        pass

    # Fallback: reload the page
    page.goto(GLAM_URL)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)


def process_job(page: Page, folder: Path, index: int, total: int):
    """Process a single glam job folder."""
    image_path = folder / "image.jpg"
    prompt_path = folder / "prompt.txt"

    if not image_path.exists():
        # Try .png as fallback
        image_path = folder / "image.png"
        if not image_path.exists():
            print(f"  [SKIP] No image.jpg/png in {folder.name}")
            return

    if not prompt_path.exists():
        print(f"  [SKIP] No prompt.txt in {folder.name}")
        return

    prompt_text = prompt_path.read_text(encoding="utf-8").strip()

    print(f"\n[{index}/{total}] {folder.name}")
    print(f"  Prompt: {prompt_text[:80]}...")

    # Clear previous state
    clear_previous_upload(page)

    # Upload image
    print("  Uploading image...")
    upload_image(page, image_path)

    # Set prompt
    print("  Setting prompt...")
    set_prompt(page, prompt_text)

    # Generate
    print("  Clicking Generate...")
    click_generate(page)

    # Wait for completion
    print("  Waiting for generation...")
    success = wait_for_completion(page)

    if success:
        print("  Done!")
    else:
        print("  Timed out — moving to next")


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python glam_uploader.py /path/to/glam_jobs   # Batch upload")
        print("  python glam_uploader.py --login               # Login setup")
        sys.exit(1)

    arg = sys.argv[1]

    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            user_data_dir=BROWSER_DATA_DIR,
            headless=False,
            viewport={"width": 1400, "height": 900},
            args=["--disable-blink-features=AutomationControlled"],
        )
        page = browser.pages[0] if browser.pages else browser.new_page()

        if arg == "--login":
            print("Glam AI にログインしてください。")
            print("ログイン完了後、ブラウザを閉じてください。")
            page.goto(GLAM_URL)
            try:
                page.wait_for_timeout(300_000)  # 5 minutes
            except Exception:
                pass
            browser.close()
            return

        jobs_dir = Path(arg)
        if not jobs_dir.is_dir():
            print(f"Error: {arg} is not a directory")
            browser.close()
            sys.exit(1)

        folders = get_job_folders(jobs_dir)
        if not folders:
            print(f"No subfolders found in {jobs_dir}")
            browser.close()
            sys.exit(1)

        print(f"Found {len(folders)} jobs to process")

        # Navigate to Glam AI
        page.goto(GLAM_URL)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)

        # Ensure we're on the Video tab
        try:
            video_tab = page.get_by_text("Video", exact=True).first
            video_tab.click()
            page.wait_for_timeout(1000)
        except Exception:
            pass  # Already on Video tab

        for i, folder in enumerate(folders, 1):
            process_job(page, folder, i, len(folders))

        print(f"\nAll {len(folders)} jobs completed!")
        browser.close()


if __name__ == "__main__":
    main()
