import logging
import time
import os

from django.utils import timezone
from .models import ImportJob, User
from .import_pipeline import EmployeeImportPipeline

logger = logging.getLogger(__name__)

def process_employee_import(job_id, file_path, user_id, send_email=True):
    logger.info(f"Starting sync import for job {job_id}... send_email={send_email}")
    """
    Asynchronous task to process employee Excel import.
    Updates the ImportJob status and progress.
    """
    try:
        job = ImportJob.objects.get(id=job_id)
        user = User.objects.get(id=user_id)
        
        job.status = 'processing'
        job.save(update_fields=['status'])
        
        # Open the file from the saved path
        with open(file_path, 'rb') as f:
            pipeline = EmployeeImportPipeline(f, user, send_email=send_email)
            
            # Hook into the pipeline to update progress
            # We'll modify the pipeline to accept a progress callback
            def progress_callback(current, total):
                progress_pct = int((current / total) * 100)
                if progress_pct != job.progress:
                    job.progress = progress_pct
                    job.save(update_fields=['progress'])
            
            pipeline.progress_callback = progress_callback
            
            success, result = pipeline.run()
            
            if success:
                job.status = 'completed'
                job.progress = 100
                job.total_rows = result['total']
                job.success_count = result['success']
                job.failed_count = result['failed']
                job.error_summary = result['errors']
                
                if result['error_file_data']:
                    from django.core.files.base import ContentFile
                    job.error_file.save(f"error_{job_id}.xlsx", ContentFile(result['error_file_data']))
                
                job.duration_ms = result.get('duration_ms', 0)
                job.message = "Import completed successfully."
            else:
                job.status = 'failed'
                job.message = str(result)
            
            job.save()
            
    except Exception as e:
        logger.error(f"Async import failed for job {job_id}: {str(e)}")
        if 'job' in locals():
            job.status = 'failed'
            job.message = f"Internal system error: {str(e)}"
            job.save()
    finally:
        # Cleanup temporary file if it exists
        if os.path.exists(file_path):
            os.remove(file_path)
