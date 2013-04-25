# Swimlanes for Unfuddle

This app was built to mimic the [Menlo Innovations](http://www.menloinnovations.com/) paper-based "work authorization board." View an example [here](http://www.flickr.com/photos/menlopics/7594251048/).

It grabs information about your team's tasks for the current week from Unfuddle and neatly arranges them in swimlanes -- one for each team member.

"Story cards" (Unfuddle tasks):

- Are placed on a day of the week based on their due date set in Unfuddle.
- Can be dragged/dropped across the board to new assignees and days. 
- The rearranged configuration can then be saved/sent to Unfuddle.

# Get started

Clone the repository:

    $ git clone git://github.com/newsapps/swimlanes.git 
    $ cd swimlanes

Optionally create a virtualenv:

    $ mkvirtualenv swimlanes

Install requirements:

    $ pip install -r requirements.txt

Edit the config.py with your Unfuddle account information:

    UNFUDDLE_PASS = '...'
    UNFUDDLE_USERNAME = '...'
    UNFUDDLE_ACCOUNT = '...'

If you want to show swimlanes for only a subset of the people in your Unfuddle account, add their account email address to SWIMMERS in config.py:

    # Show one swimlane with tasks assigned to rnagle@tribune.com
    SWIMMERS = ['rnagle@tribune.com', ]

Run lib/update.py to fetch the less volatile Unfuddle data (i.e. projects, milestones, people):

    $ python lib/update.py all

Run the server and visit in your browser:

    $ python runserver.py

# Task status indicators

Depending on its status, a small circle appear in the lower right corner of a story card. These circles indicate the ticket's current Unfuddle status and provide a way to gauge your team's progress on this week's tasks at a glance.

- Blue: the task has been "accepted" and is in progress.
- Yellow: the task is "resolved" -- finished but waiting for feedback or deployment
- Green: the task is "closed" -- finished, committed, deployed
