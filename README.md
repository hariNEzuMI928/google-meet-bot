# google-meet-bot

## GASでプロジェクトを準備

まず以下にアクセスし、空のプロジェクトを作成します。
https://script.google.com/home

まず定数を定義します。
`VERIFICATION_TOKEN`と`BOT_USER_OAUTH_TOKEN`は、あとでSlackアプリのページから取得しますので、一旦は適当な文字で大丈夫です。

```javascript
const VERIFICATION_TOKEN = 'xxxxxxxxxxxxxxxxxxxxxxxx';
const BOT_USER_OAUTH_TOKEN = 'xoxb-xxxxxxxxxxxxxxxxxxxxxxx'
const SLACK_POST_URL = 'https://slack.com/api/chat.postMessage';
```

続いてMeetのURLを作成します。


```javascript
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
```

続いてSlackに投稿する関数を用意します。

```javascript
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
```

最後に、Slackから呼び出される部分を実装します。

```javascript
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
```


## Slackアプリ作成

以下にアクセスし、任意のワークスペースにSlackアプリを作成します。
https://api.slack.com/apps

作成したら`Basic Information`から`Verification Token`を、`Add features and functionality`から`OAuth & Permissions`の`Bot User OAuth Token`をコピーしてGASで作成したプログラムの定数部分に貼り付けます。
貼り付けたらGASプロジェクトをデプロイして、デプロイURLををコピーしておきます。

続いて`Add features and functionality`から`Slash Commands`を有効にします

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/570466/306226dc-bafb-f602-53a9-141ab6d4a471.png)


続いて`Event Subscriptions`を有効にし、上記でコピーしたデプロイURLを`Request URL `に貼り付けます。
問題なければ「Verified✔」と出るはずです！

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/570466/90dd5cf3-3e41-40a0-b6ed-03c690028f2e.png)

続いて`Event Subscriptions`のページでアプリに追わせるイベントを設定します。
今回は`app_mention`を設定します。

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/570466/3057e7c5-7f28-4020-a3cb-894fd9e47c22.png)

ここまで出来たらアプリをSlackワークスペースにインストールさせて、Botにメンションを飛ばしてみましょう！
こんな感じにできたら成功です、おめでとうございます🎉🎊

![スクショ](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/570466/2f9b5e19-1596-5194-bb09-4a818b975ae2.jpeg)

