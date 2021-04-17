const VERIFICATION_TOKEN = 'xxxxxxxxxxxxxxxxxxxxxxxx';
const BOT_USER_OAUTH_TOKEN = 'xoxb-xxxxxxxxxxxxxxxxxxxxxxx'
const SLACK_POST_URL = 'https://slack.com/api/chat.postMessage';

/* Slackにメッセージを送信 */
function doPost(e) {
  const meetUrl = getMeetUrl();
  let message = meetUrl !== undefined ? `Meetの部屋を作ったよ\n${meetUrl}` : 'URL生成できなかった。ごめんね';
  let response = {
    response_type: 'in_channel',
    text: message,
  };

  if (e.parameter.command) {
    if (e.parameter.token !== VERIFICATION_TOKEN) {
      return null;
    }
    // Slash command
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);

  } else if (e.postData) {
    const contents = JSON.parse(e.postData.contents);

    if (contents.token !== VERIFICATION_TOKEN) {
      return null;
    }

    if (contents.type === 'url_verification') {
      // Event SubscriptionsのPost先URL検証のため
      return ContentService.createTextOutput(contents.challenge);
    } else if (contents.type === 'event_callback') {

      // botがbotの投稿に反応しないようにする
      if (contents.event.subtype && contents.event.subtype === 'bot_message') {
        return null;
      }

      // アプリメンションで起動させる
      if (contents.event.type === 'app_mention') {
        postMessage(contents.event, message);
      }
    }
  }
}

/* Google MeetのURLを作成 */
function getMeetUrl() {
  const calendarId = 'primary'; // 一時的にイベントを作成するカレンダーID
  const dt = new Date();
  const date = dt.getFullYear() + '-' + (dt.getMonth() + 1) + '-' + dt.getDate();
  const requestId = Math.random().toString(32).substring(2); // 適当な文字列を作る
  const events = Calendar.Events.insert({
    summary: 'tmp_event',
    singleEvents: true,
    allDayEvent: true,
    start: { date },
    end: { date },
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        },
      }
    }
  }, calendarId, { conferenceDataVersion: 1 })

  // MeetURLだけあれば良いので、作成後に予定そのものは削除する
  Calendar.Events.remove(calendarId, events.id);

  if (events.conferenceData.createRequest.status.statusCode === 'success') {
    const meetUrl = events.conferenceData.entryPoints[0].uri;
    return meetUrl;
  }
}

/* Slackに投稿 */
function postMessage(event, message) {
  const thread_ts = event.thread_ts ?? event.ts;
  const params = {
    method: 'post',
    payload: {
      token: BOT_USER_OAUTH_TOKEN,
      channel: event.channel,
      thread_ts: thread_ts,
      text: message,
    },
  };
  UrlFetchApp.fetch(SLACK_POST_URL, params);
}
