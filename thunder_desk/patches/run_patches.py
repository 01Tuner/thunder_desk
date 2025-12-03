"""
Utility script to check and run thunder_desk patches.

This script helps fix the issue where patches are marked as completed
during app installation without actually being executed.

Usage:
    bench --site <site_name> execute thunder_desk.patches.run_patches.check_and_run
    bench --site <site_name> execute thunder_desk.patches.run_patches.force_run_all
"""

import frappe
from pathlib import Path


def get_patches_from_file():
	"""Read patches from patches.txt file."""
	# Get the app directory (thunder_desk) - patches.txt is at thunder_desk/patches.txt
	app_path = Path(__file__).parent.parent
	patches_file = app_path / "patches.txt"
	
	patches = []
	
	if not patches_file.exists():
		print(f"Warning: {patches_file} not found. Using empty patch list.")
		return patches
	
	with open(patches_file, "r") as f:
		current_section = None
		for line in f:
			line = line.strip()
			
			# Skip empty lines and comments
			if not line or line.startswith("#"):
				continue
			
			# Check for section headers
			if line.startswith("[") and line.endswith("]"):
				current_section = line[1:-1]
				continue
			
			# Collect patches from both sections
			if current_section in ["pre_model_sync", "post_model_sync"]:
				if line and not line.startswith("#"):
					patches.append(line)
	
	return patches


def check_patch_status():
	"""Check which patches are marked as executed but may not have actually run."""
	patches = get_patches_from_file()
	
	executed_patches = set(
		frappe.get_all("Patch Log", filters={"skipped": 0}, fields="patch", pluck="patch")
	)
	
	print("\n=== Thunder Desk Patch Status ===\n")
	
	not_executed = []
	already_executed = []
	
	for patch in patches:
		if patch in executed_patches:
			already_executed.append(patch)
			print(f"✓ {patch} - Marked as executed")
		else:
			not_executed.append(patch)
			print(f"✗ {patch} - NOT executed")
	
	print(f"\nSummary: {len(already_executed)} executed, {len(not_executed)} pending")
	
	return {
		"executed": already_executed,
		"pending": not_executed
	}


def remove_patch_log_entries():
	"""Remove patch log entries so patches can be re-run."""
	patches = get_patches_from_file()
	
	print("\n=== Removing Patch Log Entries ===\n")
	
	for patch in patches:
		if frappe.db.exists("Patch Log", {"patch": patch}):
			frappe.db.delete("Patch Log", {"patch": patch})
			print(f"✓ Removed log entry for: {patch}")
		else:
			print(f"- No log entry found for: {patch}")
	
	frappe.db.commit()
	print("\n✓ Patch log entries removed. You can now run 'bench migrate' to execute patches.")


def force_run_all():
	"""Force run all thunder_desk patches even if they're marked as executed."""
	from frappe.modules.patch_handler import run_single
	
	patches = get_patches_from_file()
	
	print("\n=== Force Running Thunder Desk Patches ===\n")
	
	for patch in patches:
		print(f"\nRunning: {patch}")
		try:
			run_single(patchmodule=patch, force=True)
			print(f"✓ Successfully executed: {patch}")
		except Exception as e:
			print(f"✗ Failed to execute {patch}: {str(e)}")
			raise
	
	print("\n✓ All patches executed successfully!")


def check_and_run():
	"""Check patch status and provide instructions."""
	status = check_patch_status()
	
	if status["executed"]:
		print("\n⚠️  WARNING: Some patches are marked as executed but may not have actually run.")
		print("\nTo fix this, you have two options:")
		print("\nOption 1: Remove log entries and run migrate")
		print("  bench --site <site> execute thunder_desk.patches.run_patches.remove_patch_log_entries")
		print("  bench --site <site> migrate")
		print("\nOption 2: Force run patches now")
		print("  bench --site <site> execute thunder_desk.patches.run_patches.force_run_all")
	
	if status["pending"]:
		print("\n✓ Some patches are pending. Run 'bench migrate' to execute them.")


if __name__ == "__main__":
	# For direct execution
	check_and_run()

