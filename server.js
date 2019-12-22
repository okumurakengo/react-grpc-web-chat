const PROTO_PATH = __dirname + "/simplechat.proto";

const grpc = require("grpc");
const protoLoader = require("@grpc/proto-loader");
const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {keepCase: true,
     longs: String,
     enums: String,
     defaults: true,
     oneofs: true
    });
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const simplechat = protoDescriptor.simplechat;

/**
 * チャットデータ
 *
 * @typedef {Object} chatData
 *
 * @property {number} userId
 * @property {string} text
 * @property {Date} postDate
 */
/**
 * @type {chatData[]} chatDataList
 */
let chatDataList = [];
/**
 * 新しく追加されたチャットデータ
 * 
 * @type {chatData[]} latestChatDataList
 */
let latestChatDataList = [];
/**
 * 入力中のユーザーのID
 * 
 * @type {Set<number>} typingUserIds
 */
let typingUserIds = new Set;

(async function repeat() {
  while (true) {
    let lastGetDate = new Date;
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 最新のチャットのみを保存しておく
    latestChatDataList = [];
    for (const { userId, text, postDate } of chatDataList) {
      if (lastGetDate.getTime() <= postDate.getTime()) {
        latestChatDataList.push({ user_id: userId, text });
        continue;
      }
      break;
    }

    // 入力中のユーザー初期化
    typingUserIds = new Set;
  }
})();

// チャット追加
function doAddChat(call, callback) {
  const { chat_data: { user_id: userId, text } } = call.request;
  chatDataList = [ 
    { userId, text, postDate: new Date },
    ...chatDataList, 
  ];
  callback(null, { result: true });
}

// チャット取得
async function doRepeatChat(call) {
  // 接続開始時に全てのチャットの内容を取得
  call.write({
    chat_data: chatDataList.map(({ channel, userId: user_id, text }) => ({ channel, user_id, text })),
  });

  // 接続している間はループ、接続が切れたらループを抜ける
  while (!call.cancelled) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    call.write({ chat_data: latestChatDataList, typing_user_id: [...typingUserIds] });
  }
}

// 入力しているユーザー追加
function doTypingChat(call, callback) {
  typingUserIds.add(call.request.user_id);
  callback(null, { result: true });
}

function getServer() {
  const server = new grpc.Server();
  server.addService(simplechat.ChatCaller.service, {
    addChat: doAddChat,
    repeatChat: doRepeatChat,
    typingChat: doTypingChat,
  });
  return server;
}

if (require.main === module) {
  const server = getServer();
  server.bind("0.0.0.0:9090", grpc.ServerCredentials.createInsecure());
  server.start();
}

exports.getServer = getServer;
