import { useEffect, useState } from "react";
// import icon
import { BsPrinterFill, BsSendPlus } from "react-icons/bs";
import { ThreeDots, ThreeCircles } from "react-loader-spinner";

import "bootstrap/dist/css/bootstrap.css";
import { styles } from "./styles";
import { ablyConfig, colors } from "./config";

// Creating a connection to ably
const Ably = require("ably");

function SupportDashboard() {
  // state variables
  const [message, setMessage] = useState(null);
  const [pageDisplay, setPageDisplay] = useState("initiateChat");

  // state variables for ably
  const [channelID, setChannelID] = useState(null);
  const [allChannelMessages, setAllChannelMessages] = useState([]);
  const [allActiveChannels, setAllActiveChannels] = useState([]);

  // ably variables
  var realtime = null;
  var channel = null;

  // custom sleep function
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // function on form submit
  const handleSubmit = (event) => {
    event.preventDefault();
    if (channelID == null) {
      alert("You have not connected to any channel.");
      return;
    }
    // calling the send message function
    sendMessageViaAbly(message);
    // resetting the input field
    setMessage("");
  };

  // opening a connection with ably
  const openAblyConnection = (email = channelID) => {
    // persisting the email as the channel id
    setChannelID(email);
    // creating the connection to ably
    realtime = new Ably.Realtime({
      key: ablyConfig.api_key,
    });

    // creating a channel
    if (email.startsWith("livechat:")) {
      channel = realtime.channels.get(`${email}`);
    } else {
      channel = realtime.channels.get(`livechat:${email}`);
    }

    // attaching to channel
    channel.attach(function (err) {
      // displaying the chat interface
      setPageDisplay("chatWindow");
      // getting channel messages if any
      getChannelMessages();
      // creating a listener to check for new messages anytime a message is sent with name "Support"
      channel.subscribe("Client", function (message) {
        // calling method that handles new messages
        handleNewMessage(message);
        console.log("new message:" + message);
      });
    });
  };

  // function to send messages
  const sendMessageViaAbly = (message) => {
    if (channel == null) {
      openAblyConnection();
    }

    var message_structure = { type: "text", data: message };
    channel.publish("Support", message_structure, function (err) {
      alert("message sent");
      // updating channel messages
      getChannelMessages();
    });
  };

  // function to send typing notification
  const sendTypingNotification = () => {
    if (channelID == null) {
      return;
    }
    if (channel == null) {
      openAblyConnection();
    }

    // checking first if the last message sent was a typing notification
    if (allChannelMessages.length != 0) {
      if (
        allChannelMessages[0].name == "Support" &&
        allChannelMessages[0].data["type"] == "typing"
      ) {
        return;
      }
    }

    var message_structure = { type: "typing" };
    channel.publish("Support", message_structure, function (err) {
      // updating channel messages
      getChannelMessages();
    });
  };

  // function to get channel messages
  const getChannelMessages = () => {
    if (channel == null) {
      openAblyConnection();
    }
    // loading the channel messages via "history"
    channel.history(function (err, resultPage) {
      // updating the state variable
      setAllChannelMessages(resultPage.items);
      console.log(resultPage.items);
    });
  };

  // handle new messages
  const handleNewMessage = (message) => {
    // to implement "typing" indicator
    if (message.data.type == "typing") {
      // display "typing" here
      getChannelMessages();
    } else if (message.data.type == "text") {
      // loading/updating messages list
      getChannelMessages();
    } else if (message["name"] == "Support") {
      // loading/updating messages list
      getChannelMessages();
    }
  };

  const getChannels = async () => {
    // getting active channels
    var rest = new Ably.Rest(ablyConfig.api_key);
    rest.request("get", "/channels", {}, null, null, function (err, response) {
      if (err) {
        console.log("An error occurred; err = " + err.toString());
      } else {
        console.log("Success! status code was " + response.statusCode);
        console.log(response);
        if (response.statusCode == 200) {
          setAllActiveChannels(response.items);
          console.log(response.items.length + " items returned");
        }
      }
    });
  };

  useEffect(() => {
    getChannels();
  }, []);

  // style objects
  const containerSpecificStyle = {
    Support: styles.supportMessageContainer,
    Client: styles.clientMessageContainer,
  };
  const boxSpecificStyle = {
    Support: styles.supportMessageBox,
    Client: styles.clientMessageBox,
  };

  // message component
  const MessageComponent = ({ message, index }) => {
    if (message.data.type == "typing") {
      if (index == 0 && message.name == "Client") {
        return <ThreeDots color="#ee6e46" height="50" width="50" />;
      } else {
        return <></>;
      }
    }

    return (
      <>
        {/* Date/time */}
        <div
          style={{
            textAlign: message.name == "Support" ? "right" : "left",
            fontSize: 9,
            color: "grey",
          }}
        >
          {message.name == "Client" && "Client"}
        </div>

        {/* Message box */}
        <div style={containerSpecificStyle[message.name]}>
          <div style={boxSpecificStyle[message.name]}>
            {message.name == "Support" &&
              message.data.type == "text" &&
              message.data.data}
            {message.name == "Client" &&
              message.data.type == "text" &&
              message.data.data}
          </div>
        </div>
      </>
    );
  };

  // channel component
  const ChannelComponent = ({ channel }) => {
    var trimmedName = channel.name.replace("livechat:", "");
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          borderBottomColor: "grey",
          borderBottomWidth: 1,
          borderBottomStyle: "dashed",
          padding: 5,
          paddingTop: 7,
          cursor: "pointer",
        }}
        onClick={() => {
          alert("Connecting...");
          openAblyConnection(trimmedName);
        }}
      >
        <div
          style={{
            height: 30,
            width: 30,
            borderRadius: 30,
            backgroundColor:
              trimmedName == channelID ? colors.primary : "lightgrey",
            marginRight: 10,
          }}
        ></div>
        <div
          style={{
            fontSize: 14,
            color: trimmedName == channelID ? colors.primary : "black",
          }}
        >
          {trimmedName}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h1 className="header" style={{ marginTop: "5vh" }}>
        Support Dashboard
      </h1>
      <div className="container" style={{}}>
        {/* Row */}
        <div
          className="row"
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          {/* Channels list section */}
          <div className="col-sm-3" style={styles.channelsWindow}>
            <div style={styles.channelsHeaderSection}>
              <div
                style={{
                  height: 55,
                  width: 55,
                  borderRadius: 55,
                  backgroundColor: "white",
                }}
              ></div>
              <div style={{ color: "white", marginBottom: 5 }}>
                Support Requests
              </div>
              {/* <div style={{ color: "white" }}>support@yoursite.com</div> */}
            </div>
            <div style={styles.channelsDisplaySection}>
              {allActiveChannels.map((channel, index) => (
                <ChannelComponent key={index} channel={channel} index={index} />
              ))}
            </div>
          </div>

          {/* Message Box Section */}
          <div className="col-sm-6" style={styles.chatWindow}>
            {/* Header */}
            <div style={styles.chatWindowHeader}>
              <div style={styles.brandLogoContainer}></div>
              <div style={styles.headerRow}>
                <div style={styles.headerText}>{channelID}</div>
                <BsPrinterFill
                  size={25}
                  color={"white"}
                  onClick={() => alert("Write download logic here")}
                />
              </div>
            </div>

            {/* Body */}
            <div style={styles.chatWindowBody}>
              {allChannelMessages.map((message, index) => (
                <MessageComponent key={index} message={message} index={index} />
              ))}
            </div>

            {/* Chat Input */}
            <div style={styles.chatWindowFooter}>
              {/* Form */}
              <div style={styles.messageInputContainer}>
                <form
                  onSubmit={(e) => handleSubmit(e)}
                  style={{ display: "flex", flexGrow: 1, flexShrink: 1 }}
                >
                  <input
                    style={styles.messageInput}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      sendTypingNotification && sendTypingNotification();
                    }}
                    placeholder="Send a message..."
                    value={message}
                  />
                </form>
              </div>
              <BsSendPlus
                size={25}
                color={"white"}
                onClick={(e) => handleSubmit(e)}
                style={{ marginRight: 10 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupportDashboard;
