const core = require('@actions/core')
const github = require('@actions/github');

const context = github.context;
const repoAccessToken = core.getInput('repoAccessToken');
const pullNumber = core.getInput('pullNumber');
const repo = core.getInput('repo');
const owner = core.getInput('owner');

const octokit = github.getOctokit(repoAccessToken)

const prdata = {context:{},reviews:{}}

const PR_STATES = {
    APPROVED:'APPROVED',
    CHANGES_REQUESTED:'CHANGES_REQUESTED',
    COMMENTED:'COMMENTED',
    MERGED:'MERGED',
    UNKNOWN:'UNKNOWN',
}

const PR_STATES_COLOURS = {
    APPROVED:'#2bff36',
    CHANGES_REQUESTED:'#ffc403',
    COMMENTED:'#e6e6e6',
    MERGED:'#003006',
    UNKNOWN:'#967800',
}

const EMOJIS = {
    APPROVED:':large_green_circle:',
    CHANGES_REQUESTED:':large_orange_diamond:',
    COMMENTED:':white_medium_square:',
    MERGED:':checkered_flag:',
    UNKNOWN:':hankey:',
}

// https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikipedia-logo-v2.svg/225px-Wikipedia-logo-v2.svg.png
function renderSlackMessageBody(headerText){
    return {
        
        "blocks": [
          {
            "type": "header",
            "text": {
              "type": "plain_text",
              "text": headerText,
              "emoji": true
            }
          },
          {
            "type": "divider"
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*${{github.event.pull_request.title}}*\n\n`${{github.event.pull_request.head.ref}}` > `${{github.event.pull_request.base.ref}}`" // prTitle, baseRef, headRef
            }
          },
          {
            "type": "context",
            "elements": [
              {
                "type": "mrkdwn",
                "text": "PR author:"
              },
              {
                "type": "plain_text",
                "text": "${{github.event.pull_request.user.login}}", // prAuthor
                "emoji": true
              }
            ]
          },
          {
            "type": "divider"
          },
          {
            "type": "section",
            "fields": [
              {
                "type": "mrkdwn",
                "text": "*Reviewed by:*\n${{github.actor}}" // prActor
              },
              {
                "type": "mrkdwn",
                "text": "*Link:*\n<${{github.event.pull_request._links.html.href}}|View PR>" // prLink
              }
            ]
          },
          {
            "type": "divider"
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Comment:*\n${{steps.output_args.outputs.o_comment}}" // prCommentText
            }
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Change request:*\n${{steps.output_args.outputs.o_change_request}}" // prChangeRequestText
            }
          }
        ]
      }
}

function getLastReview(reviews){
    if(reviews && reviews.length){
        return reviews[reviews.length-1]
    }
    return {} // do better
}

function onReceivePullRequestInfo(pullRequestInfo){
/**

    // see https://github.com/braddevelop/ghworkflows-sandbox/actions/runs/3694284483/jobs/6255292587 for full payload

    number: 17,
  state: 'open',
  locked: false,
  title: 'suki updates',

  user: {
    login: 'bravocollective',
    id: 120184068,
    avatar_url: 'https://avatars.githubusercontent.com/u/120184068?v=4',
    url: 'https://api.github.com/users/bravocollective',
    html_url: 'https://github.com/bravocollective',
  },

  body: null,
  assignee: null,
  assignees: [],
  requested_reviewers: [],

  head: {
    label: 'braddevelop:suki',
    ref: 'suki',
    sha
  }

  base: {
    label: 'braddevelop:master',
    ref: 'master',
    sha
  }

  merged: false,
  merged_by: null,
  comments: 0,
  review_comments: 0,

     * 
     * 
     * 
     data: [
    {
      id: 1215809276,
      node_id: 'PRR_kwDOIlNd3s5Id8b8',
      user: [Object],
      body: 'this is the new noise',
      state: 'CHANGES_REQUESTED',
      html_url: 'https://github.com/braddevelop/ghworkflows-sandbox/pull/17#pullrequestreview-1215809276',
      pull_request_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/pulls/17',
      author_association: 'OWNER',
      _links: [Object],
      submitted_at: '2022-12-13T16:05:55Z',
      commit_id: '476ca9b4857051e288a44df44c1872317f48fe5c'
    },
    {
      id: 1215824992,
      node_id: 'PRR_kwDOIlNd3s5IeARg',
      user: [Object],
      body: 'asvafavaf',
      state: 'CHANGES_REQUESTED',
      html_url: 'https://github.com/braddevelop/ghworkflows-sandbox/pull/17#pullrequestreview-1215824992',
      pull_request_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/pulls/17',
      author_association: 'OWNER',
      _links: [Object],
      submitted_at: '2022-12-13T16:10:09Z',
      commit_id: '476ca9b4857051e288a44df44c1872317f48fe5c'
    },
    {
      id: 1216329973,
      node_id: 'PRR_kwDOIlNd3s5If7j1',
      user: [Object],
      body: 'suki CR',
      state: 'CHANGES_REQUESTED',
      html_url: 'https://github.com/braddevelop/ghworkflows-sandbox/pull/17#pullrequestreview-1216329973',
      pull_request_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/pulls/17',
      author_association: 'OWNER',
      _links: [Object],
      submitted_at: '2022-12-13T19:54:34Z',
      commit_id: '476ca9b4857051e288a44df44c1872317f48fe5c'
    }
  ]
     */

    // const { data: pullRequestReviews = [] } = await octokit.rest.pulls.listReviews({
        octokit.rest.pulls.listReviews({
            owner: owner,
            repo: repo,
            pull_number: pullNumber,
            // mediaType: {
            //   format: 'diff'
            // }
        }).then(onGetReviews, console.log); // remove for prod
}

function onGetReviews(reviews){
    console.log('REPONSE:')
    console.log(reviews);
    console.log('ENDREPONSE')
    const lastReview = getLastReview(reviews.data);

    console.log('REPONSE LAST REVIW:')
    console.log(lastReview);
    console.log('ENDREPONSE')


    /*
    {
        id: 1216329973,
        node_id: 'PRR_kwDOIlNd3s5If7j1',
        user: {
            login: 'braddevelop',
            id: 69210311,
            node_id: 'MDQ6VXNlcjY5MjEwMzEx',
            avatar_url: 'https://avatars.githubusercontent.com/u/69210311?u=6d2f0f7bf732135690f7b448c0f1f9a0b41e65f2&v=4',
            gravatar_id: '',
            url: 'https://api.github.com/users/braddevelop',
            html_url: 'https://github.com/braddevelop',
            followers_url: 'https://api.github.com/users/braddevelop/followers',
            following_url: 'https://api.github.com/users/braddevelop/following{/other_user}',
            gists_url: 'https://api.github.com/users/braddevelop/gists{/gist_id}',
            starred_url: 'https://api.github.com/users/braddevelop/starred{/owner}{/repo}',
            subscriptions_url: 'https://api.github.com/users/braddevelop/subscriptions',
            organizations_url: 'https://api.github.com/users/braddevelop/orgs',
            repos_url: 'https://api.github.com/users/braddevelop/repos',
            events_url: 'https://api.github.com/users/braddevelop/events{/privacy}',
            received_events_url: 'https://api.github.com/users/braddevelop/received_events',
            type: 'User',
            site_admin: false
        },
        body: 'suki CR',
        state: 'CHANGES_REQUESTED',
        html_url: 'https://github.com/braddevelop/ghworkflows-sandbox/pull/17#pullrequestreview-1216329973',
        pull_request_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/pulls/17',
        author_association: 'OWNER',
        _links: {
            html: {
            href: 'https://github.com/braddevelop/ghworkflows-sandbox/pull/17#pullrequestreview-1216329973'
            },
            pull_request: {
            href: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/pulls/17'
            }
        },
        submitted_at: '2022-12-13T19:54:34Z',
        commit_id: '476ca9b4857051e288a44df44c1872317f48fe5c'
        }
    */

    switch (lastReview.state) {
        case PR_STATES.CHANGES_REQUESTED:
            core.setOutput('slackMessage', renderSlackMessageBody(`:large_orange_diamond: PR reviewed : ${repo}`));
            // core.setOutput('slackMessage', 'Output a slack template for CHANGES_REQUESTED')            
            break;
    
        default:
            break;
    }
}




class SlackBlocks { // todo more specfici name
    static divider() {
        return { "type": "divider" }
    }

    static messageTitle(titleText){
        return {
            "type": "header",
            "text": {
              "type": "plain_text",
              "text": titleText,
              "emoji": true
            }
        }
    }

    static prTitleAndRefs(title, baseRef, headRef) {
        return {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": `*${title}*\n\n\`${headRef}\` -> \`${baseRef}\``
            }
        }
    }

    static prAuthor(authorText){
        return {
            "type": "context",
            "elements": [
              {
                "type": "mrkdwn",
                "text": "PR author:"
              },
              {
                "type": "plain_text",
                "text": authorText,
                "emoji": true
              }
            ]
        }
    }

    // static actorAndLink(eventActorText, prUrl){ // todo no abbreviations
    //     return {
    //         "type": "section",
    //         "fields": [
    //           {
    //             "type": "mrkdwn",
    //             "text": eventActorText
    //           },
    //           {
    //             "type": "mrkdwn",
    //             "text": `*Link:*\n<${prUrl}|View PR>`
    //           }
    //         ]
    //     }
    // }

    static reviewText(text){
        return {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": text
            }
        }
    }

    // static context(primaryText, secondaryText){
    //     return {
    //         "type": "context",
    //         "elements": [
    //           {
    //             "type": "mrkdwn",
    //             "text": primaryText
    //           },
    //           {
    //             "type": "plain_text",
    //             "text": secondaryText,
    //             "emoji": true
    //           }
    //         ]
    //     }
    // }
}



// "attachments": [
//     {
//         "fallback": "Fallback : Plain-text summary of the attachment.",
//         "color": "#FF0066",
//         "pretext": "Optional text that appears above the attachment block",
//         "author_name": "Bobby Tables",
//         "author_link": "http://flickr.com/bobby/",
//         "author_icon": "https://avatars.githubusercontent.com/u/120184068?v=4",
//         "title": "Slack API Documentation",
//         "title_link": "https://api.slack.com/",
//         "text": "Optional text that appears within the attachment 222",
//         "fields": [
//             {
//                 "title": "Priority",
//                 "value": "High",
//                 "short": false
//             }
//         ],
//          "image_url": "http://my-website.com/path/to/image.jpg",
//          "thumb_url": "http://example.com/path/to/thumb.png",
//         "footer": "Slack API",
//         "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
//          "ts": 123456789
//     }
// ]

class SlackMessageTemplate {
    blocks = [];
    footer = [];
    constructor() {
        this.buildMessage()
    }

    buildMessage(){}


    buildCommonMessageBody(){
        this.blocks.push(SlackBlocks.divider())

        // Add PR Title and refs
        this.blocks.push(
            SlackBlocks.prTitleAndRefs(
                prdata.context.data.title, 
                prdata.context.data.base.ref, 
                prdata.context.data.head.ref
            )
        );

        // Add PR author
        this.blocks.push(
            SlackBlocks.prAuthor(prdata.context.data.user.login)
        )

        this.blocks.push(SlackBlocks.divider())

        // Add PR actor and link to PR
        // let actorText = `*Reviewed by:*\n${getLastReview(prdata.reviews).user.login}`
        // this.blocks.push(
        //     SlackBlocks.actorAndLink(
        //         actorText, 
        //         prdata.context.data.html_url
        //     )
        // )
    }

    buildCommonFooter(statusColour, actorActionText){
        this.footer.push(
            {
                "color": statusColour,
                "author_name": `${actorActionText}${getLastReview(prdata.reviews).user.login}`,
                "author_link": getLastReview(prdata.reviews).user.html_url,
                "author_icon": getLastReview(prdata.reviews).user.avatar_url,
                "title": "View pull request",
                "title_link": prdata.context.data.html_url,
            }
        )
    }

    output() {
        return { "attachments": this.attachments, "blocks": this.blocks }
    }
}

class PRReviewComment extends SlackMessageTemplate {
    constructor() {
      super()
    }
    
    buildMessage() {

        // Add message title
        let title = `${EMOJIS.COMMENTED} Pull Request: Comment - ${getRepositoryNameOnly()}`
        this.blocks.push(
            SlackBlocks.messageTitle(title)
        );

        super.buildCommonMessageBody();

        // Add actor comment
        this.blocks.push(
            SlackBlocks.reviewText(`*Comment:*\n${getLastReview(prdata.reviews).body || "No comment was left"}`)
        )

        super.buildCommonFooter(PR_STATES_COLOURS.COMMENTED, "Reviewed by")

    }    
}


class PRReviewChangeRequest extends SlackMessageTemplate {
    constructor() {
      super()
    }
    
    buildMessage() {
        // Add message title
        let title = `${EMOJIS.CHANGES_REQUESTED} Pull Request: Change Requested - ${getRepositoryNameOnly()}`
        this.blocks.push(
            SlackBlocks.messageTitle(title)
        );

        super.buildCommonMessageBody();

        // Add actor comment
        this.blocks.push(
            SlackBlocks.reviewText(`*Change request:*\n${getLastReview(prdata.reviews).body || "No comment was left"}`)
        )

        super.buildCommonFooter(PR_STATES_COLOURS.CHANGES_REQUESTED, "Changes requested by")
    }    
}

class PRApproved extends SlackMessageTemplate {
    constructor() {
      super()
    }
    
    buildMessage() {
        // Add message title
        let title = `${EMOJIS.APPROVED} Pull Request: Approved - ${getRepositoryNameOnly()}`
        this.blocks.push(
            SlackBlocks.messageTitle(title)
        );

        super.buildCommonMessageBody()

        // Add actor comment
        this.blocks.push(
            SlackBlocks.reviewText(`*Comment:*\n${getLastReview(prdata.reviews).body || "No comment was left"}`)
        )

        super.buildCommonFooter(PR_STATES_COLOURS.APPROVED, "Approved by")
    }    
}


class PRMerged extends SlackMessageTemplate {
    constructor() {
      super()
    }
    
    buildMessage() {
        // Add message title
        let title = `${EMOJIS.MERGED} Pull Request: Merged - ${getRepositoryNameOnly()}`
        this.blocks.push(
            SlackBlocks.messageTitle(title)
        );

        super.buildCommonMessageBody()

        super.buildCommonFooter(PR_STATES_COLOURS.MERGED, "Merged by")
    }    
}



class UnknownMessage extends SlackMessageTemplate {
    constructor() {
      super()
    }
    
    buildMessage() {
        // Add message title
        let title = `${EMOJIS.UNKNOWN} Unknown PR event : ${getRepositoryNameOnly()}`
        this.blocks.push(
            SlackBlocks.messageTitle(title)
        );
        // todo - pass some context about the PR so this can be troubleshoot'd
    }    
}



async function run(){
    /**
     * github.context log:
     * 
     Context {
        payload: {
            inputs: null,
            ref: 'refs/heads/master',
            repository: {
                allow_forking: true,
                archive_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/{archive_format}{/ref}',
                archived: false,
                assignees_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/assignees{/user}',
                blobs_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/git/blobs{/sha}',
                branches_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/branches{/branch}',
                clone_url: 'https://github.com/braddevelop/ghworkflows-sandbox.git',
                collaborators_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/collaborators{/collaborator}',
                comments_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/comments{/number}',
                commits_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/commits{/sha}',
                compare_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/compare/{base}...{head}',
                contents_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/contents/{+path}',
                contributors_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/contributors',
                created_at: '2022-12-08T14:25:30Z',
                default_branch: 'master',
                deployments_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/deployments',
                description: null,
                disabled: false,
                downloads_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/downloads',
                events_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/events',
                fork: false,
                forks: 0,
                forks_count: 0,
                forks_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/forks',
                full_name: 'braddevelop/ghworkflows-sandbox',
                git_commits_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/git/commits{/sha}',
                git_refs_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/git/refs{/sha}',
                git_tags_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/git/tags{/sha}',
                git_url: 'git://github.com/braddevelop/ghworkflows-sandbox.git',
                has_discussions: false,
                has_downloads: true,
                has_issues: true,
                has_pages: false,
                has_projects: true,
                has_wiki: true,
                homepage: null,
                hooks_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/hooks',
                html_url: 'https://github.com/braddevelop',
                id: 69210311,
                login: 'braddevelop',
                node_id: 'MDQ6VXNlcjY5MjEwMzEx',
                organizations_url: 'https://api.github.com/users/braddevelop/orgs',
                received_events_url: 'https://api.github.com/users/braddevelop/received_events',
                repos_url: 'https://api.github.com/users/braddevelop/repos',
                site_admin: false,
                starred_url: 'https://api.github.com/users/braddevelop/starred{/owner}{/repo}',
                subscriptions_url: 'https://api.github.com/users/braddevelop/subscriptions',
                type: 'User',
                url: 'https://api.github.com/users/braddevelop'
            },
            workflow: '.github/workflows/pass-github-context.yml'
        },
        eventName: 'workflow_dispatch',
        sha: 'd538b50379f17e916c8d0ad72fb792db5eae6470',
        ref: 'refs/heads/master',
        workflow: 'Pass the github context to a 3rd party action',
        action: 'get_slack_body',
        actor: 'braddevelop',
        job: 'foobar',
        runNumber: 33,
        runId: 3702028989,
        apiUrl: 'https://api.github.com',
        serverUrl: 'https://github.com',
        graphqlUrl: 'https://api.github.com/graphql'
    }
     */


    // if: github.event_name == 'pull_request_review' && github.event.review.state != 'approved' && github.event.pull_request.base.ref == 'master'.
    // if(context.eventName == 'pull_request_review' && context.)
    // context.payload.pull_request.html_url
    // core.notice('Running@111...')

    // This should be a token with access to your repository scoped in as a secret.
    // The YML workflow will need to set myToken with the GitHub Secret Token
    // repoAccessToken: ${{ secrets.GITHUB_TOKEN }}
    // https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret
    

    // octokit.rest.pulls.get({
    //     owner: owner,
    //     repo: repo,
    //     pull_number: pullNumber,
    //     // mediaType: {
    //     //   format: 'diff'
    //     // }
    // }).then(onReceivePullRequestInfo, console.log); // remove for prod

    // You can also pass in additional options as a second parameter to getOctokit
    // const octokit = github.getOctokit(myToken, {userAgent: "MyActionVersion1"});

    getAllDataStreams()


   

    core.notice('Done...')
}

function getAllDataStreams(){

    
    

    const promise1 = octokit.rest.pulls.get({
        owner: getAccountOwner(),
        repo: getRepositoryNameOnly(),
        pull_number: pullNumber,
        // mediaType: {
        //   format: 'diff'
        // }
    })

    const promise2 = octokit.rest.pulls.listReviews({
            owner: getAccountOwner(),
            repo: getRepositoryNameOnly(),
            pull_number: pullNumber,
            // mediaType: {
            //   format: 'diff'
            // }
        })

    Promise.all([promise1, promise2]).then(streamsReceived, console.log)
}


function streamsReceived(data){
    // const dataFromPromise1 = data[0]
    // const dataFromPromise2 = data[1]
    prdata.context = data[0]
    prdata.reviews = data[1].data

    
    /**
     * prdata logged:
     
    {
        context: {
            status: 200,
            url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/pulls/17',
            headers: {
                'access-control-allow-origin': '*',
                'access-control-expose-headers': 'ETag, Link, Location, Retry-After, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Used, X-RateLimit-Resource, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval, X-GitHub-Media-Type, X-GitHub-SSO, X-GitHub-Request-Id, Deprecation, Sunset',
                'cache-control': 'private, max-age=60, s-maxage=60',
                connection: 'close',
                'content-encoding': 'gzip',
                'content-security-policy': "default-src 'none'",
                'content-type': 'application/json; charset=utf-8',
                date: 'Thu, 15 Dec 2022 07:35:16 GMT',
                etag: 'W/"faf40bf2f9d96e958affeeaf1ec06aeeea23cea11e2f611fe5815014330ca542"',
                'github-authentication-token-expiration': '2023-01-13 14:04:58 +0200',
                'last-modified': 'Tue, 13 Dec 2022 19:54:34 GMT',
                'referrer-policy': 'origin-when-cross-origin, strict-origin-when-cross-origin',
                server: 'GitHub.com',
                auto_merge: null,
                active_lock_reason: null,
                merged: false,
                mergeable: null,
                rebaseable: null,
                mergeable_state: 'unknown',
                merged_by: null,
                comments: 0,
                review_comments: 0,
                maintainer_can_modify: false,
                commits: 1,
                additions: 1,
                deletions: 1,
                changed_files: 1
            },
            data: {
                url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/pulls/17',
                id: 1163292360,
                node_id: 'PR_kwDOIlNd3s5FVm7I',
                html_url: 'https://github.com/braddevelop/ghworkflows-sandbox/pull/17',
                diff_url: 'https://github.com/braddevelop/ghworkflows-sandbox/pull/17.diff',
                patch_url: 'https://github.com/braddevelop/ghworkflows-sandbox/pull/17.patch',
                issue_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/issues/17',
                number: 17,
                state: 'open',
                locked: false,
                title: 'suki updates',
                user: [Object],
                body: null,
                created_at: '2022-12-13T16:03:49Z',
                updated_at: '2022-12-13T19:54:34Z',
                closed_at: null,
                merged_at: null,
                merge_commit_sha: 'bbbf79789a64e23b9103b24c97052fe878121ea7',
                assignee: null,
                assignees: [],
                requested_reviewers: [],
                requested_teams: [],
                labels: [],
                milestone: null,
                draft: false,
                commits_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/pulls/17/commits',
                review_comments_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/pulls/17/comments',
                review_comment_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/pulls/comments{/number}',
                comments_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/issues/17/comments',
                statuses_url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/statuses/476ca9b4857051e288a44df44c1872317f48fe5c',
                head: [Object],
                base: [Object],
                _links: [Object],
                author_association: 'COLLABORATOR',
                auto_merge: null,
                active_lock_reason: null,
                merged: false,
                mergeable: null,
                rebaseable: null,
                mergeable_state: 'unknown',
                merged_by: null,
                comments: 0,
                review_comments: 0,
                maintainer_can_modify: false,
                commits: 1,
                additions: 1,
                deletions: 1,
                changed_files: 1
            }
        },
        reviews: {
            status: 200,
            url: 'https://api.github.com/repos/braddevelop/ghworkflows-sandbox/pulls/17/reviews',
            headers: {
                'access-control-allow-origin': '*',
                'access-control-expose-headers': 'ETag, Link, Location, Retry-After, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Used, X-RateLimit-Resource, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval, X-GitHub-Media-Type, X-GitHub-SSO, X-GitHub-Request-Id, Deprecation, Sunset',
                'cache-control': 'private, max-age=60, s-maxage=60',
                connection: 'close',
                'content-encoding': 'gzip',
                'content-security-policy': "default-src 'none'",
                'content-type': 'application/json; charset=utf-8',
                date: 'Thu, 15 Dec 2022 07:35:16 GMT',
                etag: 'W/"07dba8d8ce997465cb2a2f4d35316dc0d210053c3158b7d547c3d2b7490c4dcc"',
                'github-authentication-token-expiration': '2023-01-13 14:04:58 +0200',
                'referrer-policy': 'origin-when-cross-origin, strict-origin-when-cross-origin',
                server: 'GitHub.com',
                'strict-transport-security': 'max-age=31536000; includeSubdomains; preload',
                'transfer-encoding': 'chunked',
                vary: 'Accept, Authorization, Cookie, X-GitHub-OTP, Accept-Encoding, Accept, X-Requested-With',
                'x-content-type-options': 'nosniff',
                'x-frame-options': 'deny',
                'x-github-api-version-selected': '2022-11-28',
                'x-github-media-type': 'github.v3; format=json',
                'x-github-request-id': '0683:45E3:722C70:EAD496:639ACE34',
                'x-ratelimit-limit': '5000',
                'x-ratelimit-remaining': '4999',
                'x-ratelimit-reset': '1671093316',
                'x-ratelimit-resource': 'core',
                'x-ratelimit-used': '1',
                'x-xss-protection': '0'
            },
            data: [ [Object], [Object], [Object] ]
        }
    }
     */

    outputMessage()
}

function outputMessage(){
    
    core.setOutput('slackMessage',getMessageFromFactory(getTypeOfMessage(prdata.context, prdata.reviews)));
    
}

function getTypeOfMessage(prContext, prReviews){
    console.group("prcontext")
    console.log(prContext)
    console.groupEnd()
    if(prContext.data.merged){
        return PR_STATES.MERGED
    }

    let lastReview = getLastReview(prReviews)
    console.group("lastReview")
    console.log(lastReview)
    console.groupEnd()

    console.group("TEST: lastReview.hasOwnProperty('state')")
    console.log(lastReview.hasOwnProperty('state'))
    console.groupEnd()

    if(lastReview){
        console.log('returning :', lastReview.state)
        return lastReview.state
    }
    
    return PR_STATES.UNKNOWN
}

function getMessageFromFactory(type){
    console.group("getMessageFromFactory() - what is the value of type")
    console.log(type)
    console.groupEnd()

    console.group("PR_STATES")
    console.log(PR_STATES)
    console.groupEnd()
    
    switch (type) {
        case PR_STATES.COMMENTED:
            return new PRReviewComment().output()
        case PR_STATES.CHANGES_REQUESTED:
            return new PRReviewChangeRequest().output()
        case  PR_STATES.MERGED:
            return new PRMerged().output()
        case  PR_STATES.APPROVED:
            return new PRApproved().output()
        default:
            return new UnknownMessage().output()
    }
}

function getRepositoryFullName(){
    // return github.context.payload.repository.full_name
    return repo
}
function getRepositoryNameOnly(){
    return repo.split('/')[1];
}
function getAccountOwner(){
    return repo.split('/')[0];
}

run();