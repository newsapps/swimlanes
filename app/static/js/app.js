(function() {
    // Models
    var swimlanes = {}, people, tickets, projects, milestones, authboard;

    swimlanes.Collection = Backbone.Collection.extend({
        get_by_id: function(id) {
            return this._byId[id];
        },

        get_by_ids: function(ids) {
            var ret = [];

            _.each(ids, _.bind(function(v, i) {
                ret[i] = this.get_by_id(v);
            }, this));

            return new this.__proto__.constructor(ret);
        }
    });

    var Ticket = Backbone.Model.extend({
        url: function() {
            return '/ticket/' + this.get('id');
        },

        parse: function() {}
    });

    var Tickets = swimlanes.Collection.extend({ model: Ticket });

    var Person = Backbone.Model.extend({
        initialize: function(attributes) {
            _.bindAll(this);

            return this;
        },

        get_tickets: function(milestone) {
            var ret;

            if ( !!milestone ) {
                ret = tickets.filter(_.bind(function(x) {
                    return x.get('assignee_id') == this.get('id') && x.get('milestone_id') == milestone;
                }, this));
            } else {
                ret = tickets.filter(_.bind(function(x) {
                    return x.get('assignee_id') == this.get('id');
                }, this));
            }

            return new Tickets(ret);
        }
    });

    var People = swimlanes.Collection.extend({
        model: Person,

        comparator: function(person) {
            return person.get('last_name');
        },

        get_by_emails: function(emails) {
            var filtered = this.filter(function(x) {
                if ( emails.indexOf(x.get('email')) >= 0 )
                    return x; 
            });

            return new this.__proto__.constructor(filtered);
        }
    });

    var Project = Backbone.Model.extend();

    var Projects = swimlanes.Collection.extend({ model: Project });

    var Milestone = Backbone.Model.extend();

    var Milestones = swimlanes.Collection.extend({
        model: Milestone,

        // start_date and end_date should be js Date objects
        between: function(start_date, end_date) {
            var ret;

            if ( start_date && end_date ) {
                ret = this.filter(function(x) {
                    var due_date = new Date(x.get('due_on'));

                    return x.get('completed') === false && due_date >= start_date && due_date <= end_date;
                });

                return new Milestones(ret);
            } else {
                return false;
            }
        }
    });

    // Views
    var AuthBoard = Backbone.View.extend({
        className: 'authboard',

        events: {
            'click .save': 'save'
        },

        initialize: function() {
            if ( !this.options.swimlane_width )
                this.options.swimlane_width = 200;

            this.swimlanes = [];

            this.options.people.each(_.bind(function(v, i) {
                var params = {
                    model: v,
                    container: $(this.el),
                    width: this.options.swimlane_width + 'px'
                };

                if ( this.options.future )
                    params.future = true;

                this.swimlanes.push(
                    new SwimlaneView(params)
                );
            }, this));

            return this.render();
        },

        render: function() {
            $(this.el).width(
                this.options.swimlane_width * this.options.people.length);

            var toggle = 'future',
                week = 'Next week';

            if ( this.options.future ) {
                toggle = '';
                week = 'This week';
            }

            // TODO: Make a template
            this.$el.prepend('<div class="authboard-controls">' +
                             '<a class="btn" href="#' + toggle + '">' + week + '</a>' +
                             '<a class="save btn" href="#">Save changes</a>' +
                             '</div>');

            this.options.container.append(this.el);
        },

        display_message: function(message, type) {
            $('#status').remove();

            if ( type )
                type = 'alert-' + type;

            var markup = $('<div id="status" class="alert ' + type + '">' + message +
                '<a class="close" data-dismiss="alert" href="#">&times;</a></div>');

            this.$el.prepend(markup);
            markup.fadeIn();
        },

        save: function() {
            var error = false;

            _.each(this.swimlanes, _.bind(function(v, i) {
                v.tickets.each(_.bind(function(v, i) {
                    if ( v.hasChanged() ) {
                        v.save({}, {
                            success: _.bind(function(model, data) {
                                model.set(data);
                            }, this),
                            error: _.bind(function() {
                                error = true;
                            }, this)
                        });
                    }
                }, this));
            }, this));

            if ( !error )
                this.display_message('Success', 'success');
            else
                this.display_message('Error', 'error');

            return false;
        }

    });

    var SwimlaneView = Backbone.View.extend({
        className: 'swimlane',

        initialize: function() {
            this.tickets = new Tickets();

            this.date_base = 0;
            if ( this.options.future )
                this.date_base = 7;

            this.last_monday = moment().utc().day(this.date_base - 6).startOf('day').toDate();
            this.this_monday = moment().utc().day(this.date_base + 1).startOf('day').toDate();
            this.this_friday = moment().utc().day(this.date_base + 5).endOf('day').toDate();
            this.next_monday = moment().utc().day(this.date_base + 8).startOf('day').toDate();
            this.next_friday = moment().utc().day(this.date_base + 12).endOf('day').toDate();

            $(this.el).html(_.template(
                $('#swimlane-template').html(), { date_base: this.date_base }));

            // Get all tickets for this Person that have no Milestone but are
            // due this week or next week
            this.model.get_tickets().each(_.bind(function(v, i) {
                if ( !!v.get('milestone_id') )
                    return;

                var container = this.determine_container(v);

                if ( container ) {
                    new TicketView({
                        model: v,
                        container: container
                    });

                    this.tickets.add(v);
                }
            }, this));

            // Get Tickets for Person for open Milestones that end this week or the next
            milestones.between(this.last_monday, this.next_friday).each(_.bind(function(v, i) {
                var milestone_id = v.get('id');

                this.model.get_tickets(milestone_id).each(_.bind(function(v, i) {
                    var container = this.determine_container(v);

                    if ( container ) {
                        new TicketView({
                            model: v,
                            container: container
                        });

                        this.tickets.add(v);
                    }
                }, this));

            }, this));

            return this.render();
        },

        render: function() {
            this.options.container.append(this.el);

            $(this.el).attr('data-id', this.model.get('id'));

            if (this.options.width)
                $(this.el).css({ width: this.options.width });

            this.template = _.template(
                '<div class="person-name"><span><%= model.get("last_name") %> </span></div>');

            $(this.el).prepend(this.template({ model: this.model }));

            $(this.el).find('.tickets > div').sortable({
                connectWith: '.tickets > div',
                cursor: 'move',
                delay: 150,
                scrollSpeed: 40,
                start: _.bind(this.sort_start, this),
                remove: _.bind(this.sort_remove, this),
                receive: _.bind(this.sort_receive, this)
            });

            return this;
        },

        sort_start: function() {
            $(this.el).find('.summary').popover('hide');
        },

        sort_remove: function(event, ui) {
            var ticket = $(ui.item[0]);
            this.tickets.remove(ticket.data('model'));
        },

        sort_receive: function(event, ui) {
            var ticket = $(ui.item[0]);

            this.tickets.add(ticket.data('model'));

            ticket.data('model').set(
                'assignee_id', Number(ticket.parents('.swimlane').attr('data-id')));

            // If the receiver has a date, then set that date on the Ticket
            if ( !!ticket.parent().attr('data-date') ) {
                ticket.data('model').set('due_on', ticket.parent().attr('data-date'));
            } else {
                var due_date = new Date(ticket.data('model').get('due_on'));

                // Where the due date was this week, set it to next Monday. This means
                // tickets that are shifted from one Person to another, but remain
                // in next week will not have their due date reassigned as Monday.
                if ( due_date <= this.this_friday )
                    ticket.data('model').set('due_on', moment(this.next_monday).utc().format('YYYY-MM-DD'));
            }
        },

        determine_container: function(ticket) {
           var container;

            // TODO: Break these out into a Bucket view for each day of the week
            if ( !!ticket.get('due_on') ) {
                var due_date = new Date(ticket.get('due_on'));

                if ( due_date >= this.this_monday && due_date <= this.this_friday ) // This week
                    container = $(this.el).find('.day-' +  moment(due_date).utc().day());
                else if ( due_date > this.this_friday && due_date <= this.next_friday ) // Next week
                    container = $(this.el).find('.next-week');
                else // Not this week or next week
                    return false;

                return container;
            }

            return false;
        }
    });

    var TicketView = Backbone.View.extend({
        className: 'ticket',

        events: {
            'click .show-hide-list': 'show_hide_list'
        },

        initialize: function() {
            $(this.el).data({
                model: this.model
            });

            return this.render();
        },

        render: function() {
            this.project = projects.get_by_id(this.model.get('project_id'));

            $(this.el).addClass(this.project.get('theme'));
            $(this.el).attr('data-id', this.model.get('id'));

            this.template = _.template($('#ticket-details-template').html());

            var project = projects.get_by_id(this.model.get('project_id')),
                creator = people.get_by_id(this.model.get('reporter_id')),
                due_date;

            if ( this.model.get('due_on') )
                due_date = moment(this.model.get('due_on')).utc().format("MMMM Do YYYY, h:mm a");
            else
                due_date = 'None';

            $(this.el).append(this.template({
                project: project.get('title'),
                project_id: project.get('id'),
                estimate: this.model.get('hours_estimate_initial') + " hours",
                creator: creator.get('first_name') + ' ' + creator.get('last_name'),
                created_date: moment(this.model.get('created_at')).utc().format("MMMM Do YYYY, h:mm a"),
                due_date: due_date,
                status: this.model.get('status'),
                ticket_number: this.model.get('number'),
                summary: this.model.get('summary')
            }));

            this.options.container.append(this.el);

            return this;
        },

        show_hide_list: function(event) {
            var current_target = $(event.currentTarget);

            current_target
                .parent()
                .find('.ticket-details-list')
                .toggle(function() {
                    if ( $(this).is(':visible') ) {
                        $(this).parent().find('.show-hide-list')
                            .html('Show less <i class="icon-chevron-up"></i>');
                    } else {
                        $(this).parent().find('.show-hide-list')
                            .html('Show more <i class="icon-chevron-down"></i>');
                    }
                });
            return false;
        }
    });

    Backbone.sync = function(method, model, options) {
        var data, success, error, url;

        if ( method == 'create' ||  method == 'update' )
            data = model.toJSON();
        else
            data = null;

        if ( method == 'read' )
            url = model.url();
        else
            url = model.url() + '/' + method;

        success = options.success;
        error = options.error;

        var params = {
            url: url,
            type: 'POST',
            data: data,
            dataType: 'json',
            success: function(data, textStatus, jqXHR) {
                if ( !!success )
                    success(data, textStatus, jqXHR);
                else
                    return;
            },
            error: function(jqXHR, textStatus, errorThrown) {
                if ( !!error )
                    error(jqXHR, textStatus, errorThrown);
                else
                    return;
           }
        };

        $.ajax(params);
    };

    $(document).ready(function() {

        // TODO: Getting the data this way is silly. Get all of the app's
        // data with one request.

        // Get tickets
        $.ajax({
            async: false,
            url: '/tickets',
            dataType: 'json',
            success: function(data) {
                tickets = new Tickets(data);
            }
        });

        // Get projects
        $.ajax({
            async: false,
            url: '/projects',
            dataType: 'json',
            success: function(data) {
                projects = new Projects(data);
            }
        });

        // Get people
        $.ajax({
            async: false,
            url: '/people',
            dataType: 'json',
            success: function(data) {
                people = new People(data);
            }
            });

        // Get milestones
        $.ajax({
            async: false,
            url: '/milestones',
            dataType: 'json',
            success: function(data) {
                milestones = new Milestones(data);
            }
        });


        var router = Backbone.Router.extend({
            routes: {
                '': 'home',
                'future': 'future'
            },

            initialize: function() {
                var swimmers;

                if ( !!config.swimmers )
                    swimmers = people.get_by_emails(config.swimmers);
                else
                    swimmers = people;

                this.authboard_params = {
                    people: swimmers,
                    container: $('#container'),
                    swimlane_width: 300
                };

                return this;
            },

            home: function() {
                this.authboard_params.container.empty();

                authboard = new AuthBoard(this.authboard_params);
            },

            future: function() {
                this.authboard_params.container.empty();

                var params = _.extend({
                    future: true }, this.authboard_params);

                authboard = new AuthBoard(params);
            }

        });

        new router();
        Backbone.history.start();

    });
})();
