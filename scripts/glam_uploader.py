#!/usr/bin/env python3
"""
Glam AI batch video uploader.

Usage:
  python glam_uploader.py /path/to/glam_jobs      # Run batch upload
  python glam_uploader.py --login                  # First-time login setup

Reads numbered subfolders (001_*, 002_*, ...) and for each:
  1. Uploads image.jpg to Glam AI
  2. Opens Advanced Settings, sets prompt
  3. Selects Veo 3.1 model, 1080p, 8s, 16:9
  4. Clicks Generate
  5. Waits for generation to complete
  6. Moves to next folder
"""

import sys
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, Page, TimeoutError as PlaywrightTimeout

GLAM_URL = "https://glam.ai/generate/video"
WAIT_AFTER_GENERATE_SEC = 120  # 2 minutes wait after clicking Generate
BROWSER_DATA_DIR = os.path.expanduser("~/.glam-playwright-profile")

# ── Video settings ──
VIDEO_RESOLUTION = "1080p"   # 720p | 1080p | 4K
VIDEO_DURATION = "6s"        # 4s | 6s | 8s
VIDEO_RATIO = "16:9"         # auto | 16:9 | 9:16


def get_job_folders(jobs_dir: Path) -> list[Path]:
    """Get sorted subfolders matching NNN_* pattern."""
    return sorted(
        [d for d in jobs_dir.iterdir() if d.is_dir()],
        key=lambda d: d.name,
    )


def upload_image(page: Page, image_path: Path):
    """Upload image.jpg via the file input. Waits for preview to appear."""
    file_input = page.locator('input[type="file"]').first
    file_input.set_input_files(str(image_path))

    # Wait for the image preview thumbnail to appear (confirms upload is done)
    try:
        page.locator("img[src*='blob:'], img[src*='data:'], img[src*='upload'], img[src*='glam']").first.wait_for(
            state="visible", timeout=15000
        )
        print("  Image preview confirmed")
    except Exception:
        pass
    # Extra safety wait for any processing
    page.wait_for_timeout(3000)


def open_advanced_settings(page: Page):
    """Ensure Advanced Settings panel is expanded."""
    # If textarea is already visible, it's already open
    textarea = page.locator("textarea").first
    try:
        if textarea.is_visible(timeout=500):
            return
    except Exception:
        pass

    # Click "Advanced Settings" to expand
    advanced = page.get_by_text("Advanced Settings")
    if advanced.is_visible():
        advanced.click()
        page.wait_for_timeout(1000)


def set_prompt(page: Page, prompt_text: str):
    """Fill in the prompt textarea (Advanced Settings must be open)."""
    prompt_field = page.locator("textarea").first
    prompt_field.wait_for(state="visible", timeout=5000)
    prompt_field.fill(prompt_text)
    page.wait_for_timeout(300)


def select_model_veo31(page: Page):
    """
    Click the model dropdown (shows "G Veo 3.1 v" or "G Glam AI 1.0 v")
    and select "Veo 3.1" from the popup menu.

    DOM structure from screenshot:
      Models label
      [G Veo 3.1  v]  ← dropdown trigger button with chevron
      Popup:
        - Glam AI 1.0 (generator)
        - Veo 3 (Camera & lighting control T2V)
        - Veo 3.1 (Cinematic image-to-video engine) ← target
        - Veo 3.1 Fast (Quick cinematic preview mode)
    """
    # Click the model dropdown trigger — the button that contains a model name and a chevron
    # It's right below "Models" text
    try:
        # Find the model dropdown button by looking for the chevron button near "Models"
        models_label = page.get_by_text("Models", exact=True)
        # The dropdown is a sibling — get the parent container and find the button
        model_btn = models_label.locator("..").locator("button").first
        if not model_btn.is_visible():
            # Alternative: find button containing known model names
            model_btn = page.locator("button").filter(has_text="Veo").first
            if not model_btn.is_visible():
                model_btn = page.locator("button").filter(has_text="Glam AI").first

        model_btn.click()
        page.wait_for_timeout(800)

        # Now select "Veo 3.1" — must match exactly (not "Veo 3.1 Fast" or "Veo 3")
        # The option shows "Veo 3.1" with description "Cinematic image-to-video engine"
        veo_option = page.get_by_text("Cinematic image-to-video engine")
        if veo_option.is_visible():
            veo_option.click()
            page.wait_for_timeout(500)
            print("  Model: Veo 3.1 selected")
            return

        # Fallback: click the text "Veo 3.1" that's NOT "Veo 3.1 Fast"
        # Find all elements with "Veo 3.1" and pick the one without "Fast"
        options = page.locator("text=/^Veo 3\\.1$/")
        if options.count() > 0:
            options.first.click()
            page.wait_for_timeout(500)
            print("  Model: Veo 3.1 selected (exact text)")
            return

        print("  [WARN] Could not find Veo 3.1 option in dropdown")
    except Exception as e:
        print(f"  [WARN] Model selection failed: {e}")


def _find_settings_button(page: Page):
    """Find the Settings dropdown button (not 'Advanced Settings')."""
    # Pattern 1: button with "·" like "720p · 4s · auto"
    try:
        btn = page.locator("button").filter(has_text="·").first
        if btn.is_visible(timeout=1000):
            return btn
    except Exception:
        pass

    # Pattern 2: button with "Settings" text (but not "Advanced Settings")
    try:
        buttons = page.locator("button").filter(has_text="Settings")
        for i in range(buttons.count()):
            text = buttons.nth(i).inner_text()
            if "Advanced" not in text and "Settings" in text:
                return buttons.nth(i)
    except Exception:
        pass

    return None


def select_settings(page: Page):
    """
    Open the Settings popup and click 1080p, 6s, 16:9 toggle buttons.

    DOM structure (from screenshot):
      [Settings button: "720p · 4s · auto" or "Settings"]
        Popup:
          Resolution:  [720p] [1080p] [4K]
          Duration:    [4s]   [6s]    [8s]
          Ratio:       [auto] [16:9]  [9:16]
    """
    try:
        settings_btn = _find_settings_button(page)
        if not settings_btn:
            print("  [WARN] Could not find settings button")
            return

        btn_text = settings_btn.inner_text().strip().replace('\n', ' ')
        print(f"  Settings button: '{btn_text}'")

        # Already correct?
        if VIDEO_RESOLUTION in btn_text and VIDEO_DURATION in btn_text and VIDEO_RATIO in btn_text:
            print(f"  Settings already correct")
            return

        # Open popup
        settings_btn.click()
        page.wait_for_timeout(2000)

        # Confirm popup is open
        try:
            page.get_by_text("Resolution", exact=True).wait_for(state="visible", timeout=3000)
        except Exception:
            print("  [WARN] Popup not open, retrying...")
            settings_btn.click()
            page.wait_for_timeout(2000)
            try:
                page.get_by_text("Resolution", exact=True).wait_for(state="visible", timeout=3000)
            except Exception:
                print("  [WARN] Settings popup failed to open")
                return

        print("  Settings popup open. Clicking options...")
        page.wait_for_timeout(1000)

        # Click 1080p — find "Resolution" label, then click sibling containing "1080p"
        try:
            res_label = page.get_by_text("Resolution", exact=True)
            # Get the parent container of Resolution, then find 1080p inside it
            res_container = res_label.locator("..")
            res_option = res_container.locator(f"text='{VIDEO_RESOLUTION}'").first
            if res_option.is_visible(timeout=2000):
                res_option.click()
                print(f"    Clicked: {VIDEO_RESOLUTION}")
            else:
                # Fallback: just click any element with the text on the page
                page.click(f"text='{VIDEO_RESOLUTION}'")
                print(f"    Clicked (fallback): {VIDEO_RESOLUTION}")
        except Exception as e:
            print(f"    [WARN] Resolution click failed: {e}")

        page.wait_for_timeout(1500)

        # Click 6s
        try:
            dur_label = page.get_by_text("Duration", exact=True)
            dur_container = dur_label.locator("..")
            dur_option = dur_container.locator(f"text='{VIDEO_DURATION}'").first
            if dur_option.is_visible(timeout=2000):
                dur_option.click()
                print(f"    Clicked: {VIDEO_DURATION}")
            else:
                page.click(f"text='{VIDEO_DURATION}'")
                print(f"    Clicked (fallback): {VIDEO_DURATION}")
        except Exception as e:
            print(f"    [WARN] Duration click failed: {e}")

        page.wait_for_timeout(1500)

        # Click 16:9
        try:
            ratio_label = page.get_by_text("Ratio", exact=True)
            ratio_container = ratio_label.locator("..")
            ratio_option = ratio_container.locator(f"text='{VIDEO_RATIO}'").first
            if ratio_option.is_visible(timeout=2000):
                ratio_option.click()
                print(f"    Clicked: {VIDEO_RATIO}")
            else:
                page.click(f"text='{VIDEO_RATIO}'")
                print(f"    Clicked (fallback): {VIDEO_RATIO}")
        except Exception as e:
            print(f"    [WARN] Ratio click failed: {e}")

        page.wait_for_timeout(1000)

        # Close popup
        page.keyboard.press("Escape")
        page.wait_for_timeout(1000)

        # Verify
        settings_btn = _find_settings_button(page)
        if settings_btn:
            final = settings_btn.inner_text().strip().replace('\n', ' ')
            print(f"  Settings result: '{final}'")

    except Exception as e:
        print(f"  [WARN] Settings selection: {e}")


def click_generate(page: Page):
    """Click the Generate button."""
    generate_btn = page.get_by_role("button", name="Generate")
    generate_btn.click()


def wait_for_completion(page: Page):
    """Wait fixed time after clicking Generate before moving to next job."""
    wait_sec = WAIT_AFTER_GENERATE_SEC
    print(f"    Waiting {wait_sec}s for generation...")
    for elapsed in range(0, wait_sec, 10):
        page.wait_for_timeout(10000)
        print(f"    {elapsed + 10}s / {wait_sec}s")
    print("    Wait complete.")


def clear_previous_upload(page: Page):
    """Remove previously uploaded image before uploading the next."""
    try:
        # "Clear All" button near the upload area
        clear_btn = page.locator("button").filter(has_text="Clear All")
        if clear_btn.is_visible():
            clear_btn.click()
            page.wait_for_timeout(1000)
            return

        # "Clear" button at top right of the form
        clear_btn2 = page.locator("button").filter(has_text="Clear")
        if clear_btn2.is_visible():
            clear_btn2.click()
            page.wait_for_timeout(1000)
            return
    except Exception:
        pass

    # Fallback: reload the page
    page.goto(GLAM_URL)
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(5000)


def process_job(page: Page, folder: Path, index: int, total: int):
    """Process a single glam job folder."""
    image_path = folder / "image.jpg"
    prompt_path = folder / "prompt.txt"

    if not image_path.exists():
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

    # 1. Clear previous state
    clear_previous_upload(page)

    # 2. Upload image
    print("  Uploading image...")
    upload_image(page, image_path)

    # 3. Open Advanced Settings
    print("  Opening Advanced Settings...")
    open_advanced_settings(page)

    # 4. Set prompt
    print("  Setting prompt...")
    set_prompt(page, prompt_text)

    # 5. Select Veo 3.1 model
    print("  Selecting model...")
    select_model_veo31(page)

    # 6. Confirm settings
    print("  Confirming settings...")
    select_settings(page)

    # 7. Generate
    print("  Clicking Generate...")
    click_generate(page)

    # 8. Wait fixed time for generation
    wait_for_completion(page)
    print("  Done — moving to next")


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
                page.wait_for_timeout(300_000)
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
        page.wait_for_load_state("domcontentloaded")
        # Wait for the page to fully render (SPA)
        page.wait_for_timeout(5000)

        # Ensure we're on the Video tab
        try:
            video_tab = page.get_by_text("Video", exact=True).first
            video_tab.click()
            page.wait_for_timeout(2000)
        except Exception:
            pass

        for i, folder in enumerate(folders, 1):
            process_job(page, folder, i, len(folders))

        print(f"\nAll {len(folders)} jobs completed!")
        browser.close()


if __name__ == "__main__":
    main()
