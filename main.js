const core = require('@actions/core')
const github = require('@actions/github');

const context = github.context;
const repoAccessToken = core.getInput('repoAccessToken');
const pullNumber = core.getInput('pullNumber');
const repo = core.getInput('repo');
const owner = core.getInput('owner');

const octokit = github.getOctokit(repoAccessToken)

const prdata = {context:{},reviews:{}}

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
        case 'CHANGES_REQUESTED':
            core.setOutput('slackMessage', renderSlackMessageBody(`:large_orange_diamond: PR reviewed : ${repo}`));
            // core.setOutput('slackMessage', 'Output a slack template for CHANGES_REQUESTED')            
            break;
    
        default:
            break;
    }
}




class SlackBlocks {
    static divider() {
        return { "type": "divider" }
    }

    static section(text) {
        return {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": text
            }
          }
    }
}

class SlackMessageTemplate {
    blocks = [];
    constructor() {
        this.buildMessage()
    }

    output() {
        return { "blocks": this.blocks }
    }
}

class PRReviewComment extends SlackMessageTemplate {
    constructor() {
      super()
    }
    
    buildMessage() {
        this.blocks.push(SlackBlocks.section("*[PRReviewComment]*\n\n`foobar` > `master`"))
        this.blocks.push(SlackBlocks.divider())
    }    
}


class PRReviewChangeRequest extends SlackMessageTemplate {
    constructor() {
      super()
    }
    
    buildMessage() {
        this.blocks.push(SlackBlocks.section("*[PRReviewChangeRequest]*\n\n`foobar` > `master`"))
        this.blocks.push(SlackBlocks.divider())
    }    
}

class UnknownMessage extends SlackMessageTemplate {
    constructor() {
      super()
    }
    
    buildMessage() {
        this.blocks.push(SlackBlocks.section("*[UnknownMessage]*"))
    }    
}



async function run(){

    console.log("github.context:")
    console.log(github.context)
    console.log("END github.context:")


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
        owner: owner,
        repo: repo,
        pull_number: pullNumber,
        // mediaType: {
        //   format: 'diff'
        // }
    })

    const promise2 = octokit.rest.pulls.listReviews({
            owner: owner,
            repo: repo,
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
    prdata.reviews = data[1]

    
    console.log('test group log')
    console.group("prdata")
    console.log(prdata)
    console.groupEnd()
    console.log('END:test group log')

    outputMessage()
}

function outputMessage(){
    
    core.setOutput('slackMessage',getMessageFromFactory(getTypeOfMessage(prdata.context, prdata.reviews)));
    
}

function getTypeOfMessage(prContext, prReviews){

    if(prContext.merged){
        console.warn("getTypeOfMessage() prContext.merged == true:")
        return 'MERGED'
    }

    let lastReview = getLastReview(prReviews)
    console.log('lastReview')
    console.log(lastReview)
    console.log('END:lastReview')
    if(lastReview && lastReview.hasOwnProperty('state')){
        return lastReview.state
    }
    
    return 'UNKNOWN'
}

function getMessageFromFactory(type){
    switch (type) {
        case 'COMMENT':
            return new PRReviewComment().output()
        case 'CHANGES_REQUESTED':
            return new PRReviewChangeRequest().output()
        default:
            return new UnknownMessage().output()
    }
}

run();