const core = require('@actions/core')
const github = require('@actions/github')

// Load `inputs`
const repoAccessToken = core.getInput('repoAccessToken')
const pullNumber = core.getInput('pullNumber')
const repo = core.getInput('repo')
const triggeringActor = core.getInput('triggeringActor')

// Init Octokit (GitHub SDK for Node.js)
const octokit = github.getOctokit(repoAccessToken)

// Convenience value object to store retrieved pull request data
const pullRequestData = {
    context:{},
    reviews:{}
}

const PR_STATES = {
    APPROVED:'APPROVED',
    CHANGES_REQUESTED:'CHANGES_REQUESTED',
    COMMENTED:'COMMENTED',
    MERGED:'MERGED',
    UNKNOWN:'UNKNOWN',
}

const PR_STATES_COLOURS = {
    APPROVED:'#4dd654',
    CHANGES_REQUESTED:'#ffc403',
    COMMENTED:'#e6e6e6',
    MERGED:'#4dd69d',
    UNKNOWN:'#967800',
}

const PR_STATES_EMOJIS = {
    APPROVED:':large_green_circle:',
    CHANGES_REQUESTED:':large_orange_diamond:',
    COMMENTED:':left_speech_bubble:',
    MERGED:':checkered_flag:',
    UNKNOWN:':hankey:',
}

/**
 * SlackBlocks
 * 
 * Utility to build message blocks
 * @see https://api.slack.com/messaging/composing/layouts
 */
class SlackBlocks {
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

    static reviewText(text){
        return {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": text
            }
        }
    }
}

/**
 * Slack message builders
 */
class SlackMessageBase {

    pullRequestData = null;
    blocks = [];
    footer = [];

    constructor(pullRequestData) {
        this.pullRequestData = pullRequestData
        this.buildMessage()
    }

    buildMessage(){}

    buildCommonMessageBody(){
        this.blocks.push(SlackBlocks.divider())

        // Add PR Title and refs
        this.blocks.push(
            SlackBlocks.prTitleAndRefs(
                this.pullRequestData.context.data.title, 
                this.pullRequestData.context.data.base.ref, 
                this.pullRequestData.context.data.head.ref
            )
        );

        // Add PR author
        this.blocks.push(
            SlackBlocks.prAuthor(this.pullRequestData.context.data.user.login)
        )

        this.blocks.push(SlackBlocks.divider())
    }

    buildCommonFooter(statusColour, actorActionText){
        this.footer.push(
            {
                "color": statusColour,
                "author_name": `${actorActionText} ${getTriggeringActor()}`,
                // "author_link": getLastReview(pullRequestData.reviews).user.html_url,
                // "author_icon": getLastReview(pullRequestData.reviews).user.avatar_url,
                "title": "View pull request",
                "title_link": this.pullRequestData.context.data.html_url,
            }
        )
    }

    output() {
        return { "attachments": this.footer, "blocks": this.blocks }
    }
}

class PullRequestReviewComment extends SlackMessageBase {
    constructor(pullRequestData) {
      super(pullRequestData)
    }
    
    buildMessage() {

        // Add message title
        let title = `${PR_STATES_EMOJIS.COMMENTED} Pull Request: Comment - ${getRepositoryNameOnly()}`
        this.blocks.push(
            SlackBlocks.messageTitle(title)
        );

        super.buildCommonMessageBody();

        // Add actor comment
        this.blocks.push(
            SlackBlocks.reviewText(`*Comment:*\n${getLastReview(pullRequestData.reviews).body || "No comment was left"}`)
        )

        super.buildCommonFooter(PR_STATES_COLOURS.COMMENTED, "Reviewed by")

    }    
}


class PullRequestReviewChangeRequest extends SlackMessageBase {
    constructor(pullRequestData) {
        super(pullRequestData)
    }
    
    buildMessage() {
        // Add message title
        let title = `${PR_STATES_EMOJIS.CHANGES_REQUESTED} Pull Request: Change Requested - ${getRepositoryNameOnly()}`
        this.blocks.push(
            SlackBlocks.messageTitle(title)
        );

        super.buildCommonMessageBody();

        // Add actor comment
        this.blocks.push(
            SlackBlocks.reviewText(`*Request:*\n${getLastReview(pullRequestData.reviews).body || "No comment was left"}`)
        )

        super.buildCommonFooter(PR_STATES_COLOURS.CHANGES_REQUESTED, "Changes requested by")
    }    
}

class PullRequestApproved extends SlackMessageBase {
    constructor(pullRequestData) {
        super(pullRequestData)
    }
    
    buildMessage() {
        // Add message title
        let title = `${PR_STATES_EMOJIS.APPROVED} Pull Request: Approved - ${getRepositoryNameOnly()}`
        this.blocks.push(
            SlackBlocks.messageTitle(title)
        );

        super.buildCommonMessageBody()

        // Add actor comment
        this.blocks.push(
            SlackBlocks.reviewText(`*Comment:*\n${getLastReview(pullRequestData.reviews).body || "No comment was left"}`)
        )

        super.buildCommonFooter(PR_STATES_COLOURS.APPROVED, "Approved by")
    }    
}


class PullRequestMerged extends SlackMessageBase {
    constructor(pullRequestData) {
        super(pullRequestData)
    }
    
    buildMessage() {
        // Add message title
        let title = `${PR_STATES_EMOJIS.MERGED} Pull Request: Merged - ${getRepositoryNameOnly()}`
        this.blocks.push(
            SlackBlocks.messageTitle(title)
        );

        super.buildCommonMessageBody()

        super.buildCommonFooter(PR_STATES_COLOURS.MERGED, "Merged by")
    }    
}

class UnknownMessage extends SlackMessageBase {
    constructor(pullRequestData) {
        super(pullRequestData)
    }
    
    buildMessage() {
        // Add message title
        let title = `${PR_STATES_EMOJIS.UNKNOWN} Unknown PR event : ${getRepositoryNameOnly()}`
        this.blocks.push(
            SlackBlocks.messageTitle(title)
        )
    }    
}

/**
 * Utility functions
 */
function getPullRequestNumber(){
    return pullNumber
}

function getRepositoryFullName(){
    return repo
}

function getRepositoryNameOnly(){
    return repo.split('/')[1]
}

function getGithubAccountOwner(){
    return repo.split('/')[0]
}

function getLastReview(reviews){
    if(reviews && reviews.length){
        return reviews[reviews.length-1]
    }
    return {}
}

function getTriggeringActor(){
    return triggeringActor
}

/**
 * Pull Request information requests
 */
function requestDataForPullRequest(){
    const pullRequestContext = octokit.rest.pulls.get({
        owner: getGithubAccountOwner(),
        repo: getRepositoryNameOnly(),
        pull_number: getPullRequestNumber()
    })

    const pullRequestReviews = octokit.rest.pulls.listReviews({
        owner: getGithubAccountOwner(),
        repo: getRepositoryNameOnly(),
        pull_number: getPullRequestNumber()
    })

    return Promise.all([pullRequestContext, pullRequestReviews])
}


function pullRequestDataReceived(data){
    pullRequestData.context = data[0]
    pullRequestData.reviews = data[1].data

    outputMessage(pullRequestData)
}

/**
 * Action outputs
 */
function outputMessage(pullRequestData){
    core.setOutput('slackMessage',messageFactory(getTypeOfMessage(pullRequestData.context, pullRequestData.reviews)))
}

function getTypeOfMessage(prContext, prReviews){
    if(prContext.data.merged){
        return PR_STATES.MERGED
    }

    let lastReview = getLastReview(prReviews)
  
    if(lastReview){
        return lastReview.state
    }
    
    return PR_STATES.UNKNOWN
}

function messageFactory(type){
    switch (type) {
        case PR_STATES.COMMENTED:
            return new PullRequestReviewComment().output()
        case PR_STATES.CHANGES_REQUESTED:
            return new PullRequestReviewChangeRequest().output()
        case  PR_STATES.MERGED:
            return new PullRequestMerged().output()
        case  PR_STATES.APPROVED:
            return new PullRequestApproved().output()
        default:
            return new UnknownMessage().output()
    }
}

/**
 * Program entry point
 */
async function run(){
    requestDataForPullRequest().then(pullRequestDataReceived, console.log)
}

// Start
run()