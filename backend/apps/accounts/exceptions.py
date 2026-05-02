from rest_framework.views import exception_handler
import traceback

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    
    if response is None:
        return None
        
    response.data['traceback'] = traceback.format_exc()
    return response
