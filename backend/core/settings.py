"""
Django settings for core project.
All secrets and environment-specific values are loaded from .env
via python-decouple. Never hardcode credentials here.
"""

from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

# ─────────────────────────────────────────────
# BASE DIRECTORY
# ─────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent


# ─────────────────────────────────────────────
# SECURITY — loaded from .env
# ─────────────────────────────────────────────
SECRET_KEY = config('SECRET_KEY')

DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())


# ─────────────────────────────────────────────
# INSTALLED APPS
# ─────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',  # required for BLACKLIST_AFTER_ROTATION
    'employees',
]


# ─────────────────────────────────────────────
# MIDDLEWARE
# NOTE: CorsMiddleware MUST be first in this list
# ─────────────────────────────────────────────
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',          # ← MUST be first
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


# ─────────────────────────────────────────────
# CORS — loaded from .env
# NEVER use CORS_ALLOW_ALL_ORIGINS = True in production
# ─────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://127.0.0.1:3000',
    cast=Csv()
)


# ─────────────────────────────────────────────
# URLS & TEMPLATES
# ─────────────────────────────────────────────
ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'


# ─────────────────────────────────────────────
# DATABASE — loaded from .env
# ─────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME':     config('DB_NAME',     default='employee_db'),
        'USER':     config('DB_USER',     default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST':     config('DB_HOST',     default='localhost'),
        'PORT':     config('DB_PORT',     default='5432'),
    }
}


# ─────────────────────────────────────────────
# PASSWORD VALIDATION
# ─────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ─────────────────────────────────────────────
# INTERNATIONALISATION
# ─────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# ─────────────────────────────────────────────
# STATIC & MEDIA FILES
# ─────────────────────────────────────────────
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


# ─────────────────────────────────────────────
# DEFAULT PRIMARY KEY
# ─────────────────────────────────────────────
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'employees.User'


# ─────────────────────────────────────────────
# DJANGO REST FRAMEWORK
# ─────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 15,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',
        'user': '300/minute',
        'login': '10/minute',   # custom scope used on the login view
    },
}


# ─────────────────────────────────────────────
# JWT — loaded from .env
# ─────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(hours=config('JWT_ACCESS_TOKEN_HOURS', default=8,  cast=int)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=config('JWT_REFRESH_TOKEN_DAYS',  default=1,  cast=int)),
    'ROTATE_REFRESH_TOKENS':       True,
    'BLACKLIST_AFTER_ROTATION':    True,   # old refresh tokens are invalidated after use
    'UPDATE_LAST_LOGIN':           True,
    'ALGORITHM':                   'HS256',
    'AUTH_HEADER_TYPES':           ('Bearer',),
}

# ─────────────────────────────────────────────
# LOGGING
# Structured logging for all environments.
# In production, swap the console formatter to 'json'
# after installing python-json-logger:
#   pip install python-json-logger
# ─────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,

    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        # Uncomment and install python-json-logger for production:
        # 'json': {
        #     '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
        #     'format': '%(asctime)s %(levelname)s %(name)s %(message)s',
        # },
    },

    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },

    'loggers': {
        # Django internals — warnings and above only
        'django': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        # Your app — INFO and above (set to DEBUG locally if needed)
        'employees': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },

    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}
