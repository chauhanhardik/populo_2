;(function (define) {
    'use strict';

    define(['backbone',
            'underscore',
            'gettext',
            'teams/js/views/team_utils',
            'text!teams/templates/team-profile-header-actions.underscore'],
        function (Backbone, _, gettext, TeamUtils, teamProfileHeaderActionsTemplate) {
            return Backbone.View.extend({

                errorMessage: gettext("An error occurred. Try again."),
                alreadyMemberMessage: gettext("You already belong to another team."),
                teamFullMessage: gettext("This team is full."),

                events: {
                    "click .action-primary": "joinTeam",
                    "click .action-edit-team": "editTeam"
                },

                initialize: function(options) {
                    this.teamEvents = options.teamEvents;
                    this.template = _.template(teamProfileHeaderActionsTemplate);
                    this.courseID = options.courseID;
                    this.maxTeamSize = options.maxTeamSize;
                    this.currentUsername = options.currentUsername;
                    this.teamMembershipsUrl = options.teamMembershipsUrl;
                    this.showEditButton = options.showEditButton;
                    this.topicID = options.topicID;
                    this.listenTo(this.model, "change", this.render);
                },

                render: function() {
                    var view = this,
                        message,
                        showJoinButton,
                        teamHasSpace;
                    this.getUserTeamInfo(this.currentUsername, view.maxTeamSize).done(function (info) {
                        teamHasSpace = info.teamHasSpace;

                        // if user is the member of current team then we wouldn't show anything
                        if (!info.memberOfCurrentTeam) {
                            showJoinButton = !info.alreadyMember && teamHasSpace;

                            if (info.alreadyMember) {
                                message = info.memberOfCurrentTeam ? '' : view.alreadyMemberMessage;
                            } else if (!teamHasSpace) {
                                message = view.teamFullMessage;
                            }
                        }

                        view.$el.html(view.template({
                            showJoinButton: showJoinButton,
                            message: message,
                            showEditButton: view.showEditButton
                        }));
                    });
                    return view;
                },

                joinTeam: function () {
                    var view = this;
                    $.ajax({
                        type: 'POST',
                        url: view.teamMembershipsUrl,
                        data: {'username': view.currentUsername, 'team_id': view.model.get('id')}
                    }).done(function (data) {
                        view.model.fetch()
                            .done(function() {
                                view.teamEvents.trigger('teams:update', {
                                    action: 'join',
                                    team: view.model
                                });
                            });
                    }).fail(function (data) {
                        TeamUtils.parseAndShowMessage(data, view.errorMessage);
                    });
                },

                getUserTeamInfo: function (username, maxTeamSize) {
                    var deferred = $.Deferred();
                    var info = {
                        alreadyMember: false,
                        memberOfCurrentTeam: false,
                        teamHasSpace: false
                    };

                    info.memberOfCurrentTeam = TeamUtils.isUserMemberOfTeam(this.model.get('membership'), username);
                    var teamHasSpace = this.model.get('membership').length < maxTeamSize;

                    if (info.memberOfCurrentTeam) {
                        info.alreadyMember = true;
                        info.memberOfCurrentTeam = true;
                        deferred.resolve(info);
                    } else {
                        if (teamHasSpace) {
                            var view = this;
                            $.ajax({
                                type: 'GET',
                                url: view.teamMembershipsUrl,
                                data: {'username': username, 'course_id': view.courseID}
                            }).done(function (data) {
                                info.alreadyMember = (data.count > 0);
                                info.memberOfCurrentTeam = false;
                                info.teamHasSpace = teamHasSpace;
                                deferred.resolve(info);
                            }).fail(function (data) {
                                TeamUtils.parseAndShowMessage(data, view.errorMessage);
                                deferred.reject();
                            });
                        } else {
                            deferred.resolve(info);
                        }
                    }

                    return deferred.promise();
                },
                editTeam: function (event) {
                    event.preventDefault();
                    Backbone.history.navigate('topics/' + this.topicID + '/' + this.model.get('id') +'/edit-team', {trigger: true});
                }
            });
        });
}).call(this, define || RequireJS.define);
