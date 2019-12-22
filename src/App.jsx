import React, { useState, useMemo, useCallback, useEffect, Fragment, useRef } from "react";
import "./index.css";
const { ChatData, ChatDataRequest, RepeatChatRequest, TypingUserRequest } = require("../generate/simplechat_pb.js");
const { ChatCallerClient } = require("../generate/simplechat_grpc_web_pb.js");

const users = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
    { id: 3, name: "Carol" },
];

/**
 * @see {@link https://github.com/bhaskarGyan/use-throttle}
 */
function useThrottle(value, limit) {
    const [throttledValue, setThrottledValue] = useState(value);
    const lastRan = useRef(Date.now());

    useEffect(() => {
        const handler = setTimeout(function () {
            if (Date.now() - lastRan.current >= limit) {
                setThrottledValue(value);
                lastRan.current = Date.now();
            }
        }, limit - (Date.now() - lastRan.current));

        return () => {
            clearTimeout(handler);
        };
    }, [value, limit]);

    return throttledValue;
}

const App = () => {
    const [userId, setUserId] = useState(1);
    const [text, setText] = useState("");

    const [chatDataList, setChatDataList] = useState([]);
    const chatEl = useRef(null);

    const [typingUserIds, setTypingUserIds] = useState([]);

    const client = useMemo(() => new ChatCallerClient("http://localhost:8080"), []);

    // チャットに新規投稿する
    const callAddChatData = useCallback(async postText => {
        const chatData = new ChatData;
        const request = new ChatDataRequest;

        chatData.setUserId(userId);
        chatData.setText(postText)
        request.setChatData(chatData);

        await new Promise(
            resolve => client.addChat(request, {}, (err, response) => {
                resolve(response.getResult());
            })
        );
        setText("")
    }, [userId]);

    // 新規チャットがあれば取得するためストリームを開く
    useEffect(() => {
        const stream = client.repeatChat(new RepeatChatRequest, {});
        stream.on("data", response => {
            setChatDataList(oldChatDataList => [...oldChatDataList, ...response.getChatDataList()]);
            setTypingUserIds(oldTypingUserIds => response.getTypingUserIdList());
        });

        const handleBeforeunload = () => stream.cancel();
        window.addEventListener("beforeunload", handleBeforeunload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeunload)
        };
    }, []);

    // チャットに新着があれば下にスクロール
    useEffect(() => {
        chatEl.current.scrollTop = chatEl.current.scrollHeight
    }, [chatDataList.length])

    // 入力しているユーザーの情報を追加
    const throttleText = useThrottle(text, 700)
    useEffect(() => {
        const request = new TypingUserRequest;
        request.setUserId(userId);
        if (throttleText.trim()) {
            client.typingChat(request, {}, () => {});
        }
    }, [throttleText]);

    const typingUserInfo = useMemo(() => {
        const typingOtherUserIds = typingUserIds.filter(typingUserId => typingUserId !== userId)
        if (typingOtherUserIds.length === 0) {
            return '';
        }
        if (typingOtherUserIds.length === 1) {
            const user = users.find(user => user.id === typingOtherUserIds[0]);
            return `${user.name}が入力しています`;
        }
        if (typingOtherUserIds.length > 1) {
            return '複数人が入力しています';
        }
    }, [userId, typingUserIds]);

    return (
        <>
            <h1>Simple Chat</h1>
            <div className="flex">
                <div className="left">
                    <select value={userId} onChange={e => setUserId(Number(e.target.value))}>
                        {users.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
                    </select>
                </div>
                <div className="right" ref={chatEl}>
                    {chatDataList.map((chatData, i) => (
                        <Fragment key={i}>
                            <p>
                                <strong>
                                    {users.find(user => user.id === chatData.getUserId()).name}
                                </strong>
                            </p>
                            <p>{chatData.getText()}</p>
                            <hr />
                        </Fragment>
                    ))}
                </div>
            </div>
            <form onSubmit={e => {
                e.preventDefault();
                callAddChatData(text);
            }}>
                <input value={text} onChange={e => setText(e.target.value)} />
                <button type="submit">送信</button>
                {typingUserInfo}
            </form>
        </>
    );
};

export default App;
