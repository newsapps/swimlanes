DEBUG = True

#UNFUDDLE_PASS = ''
#UNFUDDLE_USERNAME = ''
#UNFUDDLE_ACCOUNT = ''

#SWIMMERS = [
    #'email@example.com',
#]

try:
    from local_config import *
except ImportError:
    pass
