import { formatTimeAgoV2 } from "@/utils";
import { ChevronRight, Users } from "lucide-react";
import { useAuthStore, useFriendStoreV3 } from "@/stores";
import clsx from "clsx";

function getGroupDisplayName(group, memberDetails) {
  if (group?.name) return group.name;
  if (group?.emoji) return group.emoji;

  const names = memberDetails
    .map((f) => f?.firstName)
    .filter(Boolean)
    .slice(0, 3);

  if (names.length) return names.join(", ");
  return "Nhóm chat";
}

// ================= Component: ConversationItem =================
export const ConversationItem = ({ msg, onSelect }) => {
  const friendMap = useFriendStoreV3((s) => s.friendDetailsMap);
  const user = useAuthStore((s) => s.user);
  const isGroup = msg.type === "group";

  const friendDetail = !isGroup ? (friendMap?.[msg.with_user] ?? null) : null;
  const groupMembers = isGroup
    ? (msg.group?.users || []).map((u) => {
        const isCurrentUser = u.user_id === user?.localId;

        return {
          userId: u.user_id,
          profilePic: isCurrentUser
            ? user?.profilePicture || "/images/default_profile.png"
            : friendMap?.[u.user_id]?.profilePic ||
              "/images/default_profile.png",
          firstName: isCurrentUser
            ? user?.firstName || "Bạn"
            : friendMap?.[u.user_id]?.firstName || "",
        };
      })
    : [];

  const displayName = isGroup
    ? getGroupDisplayName(msg.group, groupMembers)
    : `${friendDetail?.firstName || ""} ${friendDetail?.lastName || ""}`.trim();

  const latestSender = isGroup ? friendMap?.[msg.latestMessage?.userId] : null;

  const previewText = msg.latestMessage?.replyMoment
    ? "Đã trả lời Locket của bạn!"
    : isGroup && latestSender
      ? `${latestSender.firstName}: ${msg.latestMessage?.body || ""}`
      : msg.latestMessage?.body || "";

  const isUnread = msg.isRead === false;
  const sortTime = Number(msg.latestMessage?.createdAt || msg.update_time || 0);

  const visibleMembers = groupMembers.slice(0, 5);

  return (
    <div
      onClick={() =>
        onSelect({
          uid: msg.uid,
          type: msg.type || "direct",
          with_user: msg.with_user,
          group: msg.group || null,
          isRead: msg.isRead,
          friend: friendDetail || null,
        })
      }
      className={clsx(
        "relative w-full flex items-center gap-3 p-3 rounded-3xl shadow-sm cursor-pointer transition",
        {
          "bg-base-300": isUnread,
          "bg-base-200": !isUnread,
        },
      )}
    >
      {/* Avatar */}
      {isGroup ? (
        msg.group?.image_url ? (
          <img
            src={msg.group.image_url}
            alt={displayName}
            className={clsx(
              "w-15 h-15 rounded-full outline-3 p-0.5 object-cover transition-all duration-200",
              {
                "outline-amber-400": isUnread,
                "outline-gray-300": !isUnread,
              },
            )}
          />
        ) : (
          <div
            className={clsx(
              "w-15 h-15 rounded-full flex items-center justify-center transition-all duration-200 outline-3 p-0.5",
              {
                "outline-amber-400": isUnread,
                "outline-gray-300": !isUnread,
              },
            )}
          >
            {msg.group?.emoji ? (
              <span className="text-2xl">{msg.group.emoji}</span>
            ) : (
              <div className="relative w-full h-full rounded-full overflow-hidden">
                <div className="relative w-full h-full rounded-full overflow-hidden">
                  {visibleMembers.map((member, index) => (
                    <img
                      key={member.userId}
                      src={member.profilePic}
                      alt=""
                      className={clsx(
                        "absolute w-6 h-6 rounded-full object-cover border-2 border-base-100",
                        getPosition(visibleMembers.length, index),
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : friendDetail ? (
        <img
          src={friendDetail.profilePic || "./images/default_profile.png"}
          alt={friendDetail?.firstName || "user"}
          className={clsx(
            "w-15 h-15 rounded-full outline-3 p-0.5 object-cover transition-all duration-200",
            {
              "outline-amber-400": isUnread,
              "outline-gray-300": !isUnread,
            },
          )}
        />
      ) : (
        <div className="w-15 h-15 rounded-full bg-gray-300 animate-pulse" />
      )}

      {/* Nội dung */}
      <div className="flex-1 min-w-0">
        <p
          className={clsx("text-lg truncate", {
            "font-bold text-base-content": isUnread,
            "font-semibold text-base-content/50": !isUnread,
          })}
        >
          {displayName} ~ {formatTimeAgoV2(sortTime)}
        </p>
        <p
          className={clsx("text-md truncate pt-1 font-semibold", {
            "text-base-content": isUnread,
            "text-base-content/50": !isUnread,
          })}
        >
          {previewText}
        </p>
      </div>

      {/* Chevron */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        <ChevronRight className="w-6 h-6 text-gray-500" />
      </div>
    </div>
  );
};

const getPosition = (count, index) => {
  if (count === 1) {
    return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
  }

  if (count === 2) {
    return [
      "top-1/2 left-1 -translate-y-1/2",
      "top-1/2 right-1 -translate-y-1/2",
    ][index];
  }

  if (count === 3) {
    return [
      "top-1 left-1/2 -translate-x-1/2",
      "bottom-1 left-1",
      "bottom-1 right-1",
    ][index];
  }

  if (count === 4) {
    return [
      "top-1 left-1",
      "top-1 right-1",
      "bottom-1 left-1",
      "bottom-1 right-1",
    ][index];
  }

  // 5 avatars
  return [
    "top-0 left-1/2 -translate-x-1/2",
    "top-3 left-0",
    "top-3 right-0",
    "bottom-0 left-1",
    "bottom-0 right-1",
  ][index];
};
