from flask import render_template, request, json, Response
from unfuddle import Unfuddle
from config import UNFUDDLE_ACCOUNT, UNFUDDLE_PASS, UNFUDDLE_USERNAME, SWIMMERS, DEBUG
from app import app

unfuddle = Unfuddle(UNFUDDLE_ACCOUNT, UNFUDDLE_USERNAME, UNFUDDLE_PASS)


@app.route('/')
def home():
    return render_template(
        'index.html', **{
            'unfuddle_account': UNFUDDLE_ACCOUNT,
            'swimmers': SWIMMERS
        })


@app.route('/ticket/<int:id>/update', methods=['POST', ])
def save_ticket(id):
    data = request.form.to_dict()

    pared = {
        'assignee_id': data['assignee_id'],
        'due_on': data['due_on'],
        'id': data['id'],
        'project_id': data['project_id'],
    }

    ret = unfuddle.update_ticket(pared)

    if ret:
        return Response(
            json.dumps(data), headers={'Content-Type': 'application/json'})
    else:
        return Response('500 Error', status=500)


@app.route('/tickets')
def get_tickets():
    last_week = unfuddle.get_ticket_report(
        {"conditions_string": "due_on-eq-last_7_days"})
    next_month = unfuddle.get_ticket_report(
        {"conditions_string": "due_on-eq-next_30_days"})

    tickets = last_week['groups'][0]['tickets'] + \
        next_month['groups'][0]['tickets']

    return Response(
        json.dumps(tickets), headers={'Content-Type': 'application/json'})


@app.route('/projects')
def get_projects():
    projects = open('%s/static/data/projects.json' % app.root_path, 'r').read()

    return Response(projects, headers={'Content-Type': 'application/json'})


@app.route('/people')
def get_people():
    people = open('%s/static/data/people.json' % app.root_path, 'r').read()

    return Response(people, headers={'Content-Type': 'application/json'})


@app.route('/milestones')
def get_milestones():
    milestones = open('%s/static/data/milestones.json' % app.root_path).read()

    return Response(milestones, headers={'Content-Type': 'application/json'})


app.debug = DEBUG

if __name__ == '__main__':
    app.run()
