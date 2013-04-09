import os
import sys
import json

from unfuddle import Unfuddle
from config import UNFUDDLE_PASS, UNFUDDLE_USERNAME, UNFUDDLE_ACCOUNT

unfuddle = Unfuddle(UNFUDDLE_ACCOUNT, UNFUDDLE_USERNAME, UNFUDDLE_PASS)

path = os.path.dirname(os.path.abspath(__file__))


def update_people(ids=None):
    people = unfuddle.get_people()

    if ids:
        people = filter(lambda x: str(x['id']) in ids, people)

    fh = open('%s/../app/static/data/people.json' % path, 'w+')
    data_str = json.dumps(people)
    fh.write(data_str)
    fh.close()


def update_projects(ids=None):
    projects = unfuddle.get_projects()

    if ids:
        projects = filter(lambda x: str(x['id']) in ids, projects)

    fh = open('%s/../app/static/data/projects.json' % path, 'w+')
    data_str = json.dumps(projects)
    fh.write(data_str)
    fh.close()


def update_milestones(ids=None):
    milestones = unfuddle.get_milestones()

    if ids:
        milestones = filter(lambda x: str(x['id']) in ids, milestones)

    fh = open('%s/../app/static/data/milestones.json' % path, 'w+')
    data_str = json.dumps(milestones)
    fh.write(data_str)
    fh.close()


def update_tickets(for_projects=None):
    last_week = unfuddle.get_ticket_report(
        {"conditions_string": "due_on-eq-last_7_days"})
    next_month = unfuddle.get_ticket_report(
        {"conditions_string": "due_on-eq-next_30_days"})

    tickets = last_week['groups'][0]['tickets'] + \
        next_month['groups'][0]['tickets']

    fh = open('%s/../app/static/data/tickets.json' % path, 'w+')
    data_str = json.dumps(tickets)
    fh.write(data_str)
    fh.close()


def main():
    if 'all' in sys.argv:
        update_people()
        update_projects()
        update_milestones()
        update_tickets()

    if 'people' in sys.argv:
        update_people()

    if 'projects' in sys.argv:
        update_projects()

    if 'milestones' in sys.argv:
        update_milestones()

    if 'tickets' in sys.argv:
        update_tickets()

if __name__ == "__main__":
    print "Updating Unfuddle data files..."
    main()
    print "Done."
