import os
from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.files.storage import default_storage
from storages.backends.s3boto3 import S3Boto3Storage

class Command(BaseCommand):
    help = 'Upload all local media files from MEDIA_ROOT to S3/Supabase Storage'

    def handle(self, *args, **options):
        # Verify that S3 storage is indeed active
        if not isinstance(default_storage, S3Boto3Storage):
            self.stdout.write(self.style.ERROR(
                "S3 Storage is NOT active. Please configure all S3/Supabase environment variables first."
            ))
            return

        media_root = str(settings.MEDIA_ROOT)
        if not os.path.exists(media_root):
            self.stdout.write(self.style.WARNING(f"MEDIA_ROOT directory does not exist: {media_root}"))
            return

        self.stdout.write(self.style.SUCCESS("Starting media migration to S3/Supabase..."))
        
        uploaded_count = 0
        skipped_count = 0
        error_count = 0

        # Traverse local MEDIA_ROOT recursively
        for root, dirs, files in os.walk(media_root):
            # Ignore temp directories
            if 'temp_imports' in root:
                continue

            for file in files:
                if file.startswith('.'):  # Ignore hidden files (e.g. .DS_Store)
                    continue

                local_path = os.path.join(root, file)
                # Compute relative path under MEDIA_ROOT
                relative_path = os.path.relpath(local_path, media_root)

                # Check if it already exists on S3
                if default_storage.exists(relative_path):
                    self.stdout.write(f"Skipping: {relative_path} (Already exists on S3)")
                    skipped_count += 1
                    continue

                try:
                    self.stdout.write(f"Uploading: {relative_path}...")
                    with open(local_path, 'rb') as f:
                        default_storage.save(relative_path, f)
                    self.stdout.write(self.style.SUCCESS(f"Successfully uploaded: {relative_path}"))
                    uploaded_count += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error uploading {relative_path}: {e}"))
                    error_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nMigration completed!\n"
            f"Uploaded: {uploaded_count}\n"
            f"Skipped: {skipped_count}\n"
            f"Errors: {error_count}"
        ))
