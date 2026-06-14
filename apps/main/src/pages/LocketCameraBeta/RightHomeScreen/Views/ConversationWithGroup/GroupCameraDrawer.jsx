import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { ChevronDown, Users } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { usePostStore } from "@/stores";
import { resetAllPostData } from "@/utils";

// Tái dùng nguyên các mảnh camera của MainHomeScreen
import MediaPreview from "@/pages/LocketCameraBeta/MainHomeScreen/Layout/MediaPreview";
import ActionControls from "@/pages/LocketCameraBeta/MainHomeScreen/ActionControls";

/**
 * Drawer toàn màn hình mở từ dưới lên: chụp/quay ảnh và gửi vào nhóm.
 *
 * Tái dùng camera singleton của MainHomeScreen — MainHomeScreen sẽ tự ẩn
 * <MediaPreview> của nó khi navigation.isGroupCamOpen = true để tránh
 * 2 thẻ <video> tranh cùng camera.videoRef.
 *
 * z-index: drawer = z-[70] (trên chat z-60) nhưng DƯỚI crop (z-[80]) và
 * caption studio CustomeStudio (z-90) để 2 modal đó nổi lên trên khi mở.
 */
const GroupCameraDrawer = ({ open, onClose, group }) => {
  const { camera, post, navigation } = useApp();
  const {
    selectedFile,
    setSelectedFile,
    preview,
    setPreview,
    setSizeMedia,
    imageToCrop,
    setImageToCrop,
    setVideoCrop,
    setVideoCropArea,
  } = post;
  const { setCameraActive, streamRef, cameraActive } = camera;
  const { setGroupCamOpen } = navigation;

  const setSelectedGroupId = usePostStore((s) => s.setSelectedGroupId);
  const setAudience = usePostStore((s) => s.setAudience);
  const setSelectedRecipients = usePostStore((s) => s.setSelectedRecipients);

  const [showModal, setShowModal] = useState(false);
  const [animate, setAnimate] = useState(false);
  const wasOpen = useRef(false);

  const resetMedia = () => {
    setSelectedFile(null);
    setPreview(null);
    setSizeMedia(null);
    setImageToCrop(null); // dọn cropper (CropImageStudio ở root) để không kẹt trên MainScreen
    setVideoCrop(null);
    setVideoCropArea(null);
  };

  // Vòng đời mở / đóng
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      resetMedia();
      resetAllPostData(); // clean overlay + targeting trước khi gán lại
      setSelectedGroupId(group?.id || null);
      setAudience("selected");
      setSelectedRecipients([]);
      setCameraActive(true);
      setGroupCamOpen(true);
      setShowModal(true);
      const t = setTimeout(() => setAnimate(true), 10);
      return () => clearTimeout(t);
    }

    if (!wasOpen.current) return; // chưa từng mở → bỏ qua (tránh reset lúc mount)
    wasOpen.current = false;
    setAnimate(false);

    // Dừng hẳn stream + đảm bảo cameraActive (như DelButton) để MainScreen
    // mount lại MediaPreview và startCamera SẠCH, tránh kẹt camera phải reload.
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(true);
    resetMedia();
    resetAllPostData(); // clear selectedGroupId + overlay

    const t = setTimeout(() => {
      setShowModal(false);
      setGroupCamOpen(false); // trả camera lại MainScreen sau khi trượt xong
    }, 300);
    return () => clearTimeout(t);
  }, [open]);

  // Giữ đích gửi = nhóm này suốt thời gian mở.
  // SendButton reset store sau khi gửi (selectedFile -> null) nên cần gán lại.
  useEffect(() => {
    if (!open || !group?.id) return;
    setSelectedGroupId(group.id);
    setAudience("selected");
    setSelectedRecipients([]);
  }, [open, group?.id, selectedFile]);

  // Upload đặt cameraActive=false; nếu huỷ crop (không còn ảnh chờ) thì camera
  // bị kẹt tắt → bật lại để live preview hiện lại.
  useEffect(() => {
    if (open && !cameraActive && !selectedFile && !preview && !imageToCrop) {
      setCameraActive(true);
    }
  }, [open, cameraActive, selectedFile, preview, imageToCrop]);

  if (!showModal) return null;

  const groupName = group?.name || group?.emoji || "Nhóm";

  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 z-[70] bg-base-100 text-base-content flex flex-col transition-transform duration-300 ${
        animate ? "translate-y-0" : "translate-y-full"
      }`}
    >
      {/* TOP: mũi tên xuống = bấm để đóng */}
      <button
        onClick={onClose}
        className="flex items-center justify-center pt-6 pb-2 active:scale-90 transition-transform"
        aria-label="Đóng"
      >
        <ChevronDown size={36} className="text-base-content/80" />
      </button>

      {/* CAMERA BOX (reuse MediaPreview: box + flash + zoom + caption editor) */}
      {/* Gate theo `open`: unmount NGAY khi đóng để drawer hấp hối không async-restart
          camera (đua với MainScreen MediaPreview do dùng chung streamRef/videoRef). */}
      <div className="flex-1 flex items-center justify-center px-4">
        {open && <MediaPreview />}
      </div>

      {/* CONTROLS — tái dùng nguyên ActionControls (upload/chụp/xoay ⇄ xóa/gửi/caption studio) */}
      <div className="w-full flex justify-center mt-2">
        <ActionControls />
      </div>

      {/* BOTTOM: đích gửi (thay cho "Lịch sử") */}
      <div className="flex items-center justify-center gap-3 py-6">
        {group?.image_url ? (
          <img
            src={group.image_url}
            alt=""
            className="w-10 h-10 rounded-full object-cover border border-base-300"
          />
        ) : group?.emoji ? (
          <div className="w-10 h-10 rounded-full bg-base-300 flex items-center justify-center text-xl">
            {group.emoji}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-base-300 flex items-center justify-center">
            <Users className="w-5 h-5 text-base-content/70" />
          </div>
        )}
        <div className="flex flex-col leading-tight">
          <span className="text-[12px] text-base-content/60">Đang gửi đến</span>
          <span className="text-[15px] font-bold text-base-content">
            {groupName}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default GroupCameraDrawer;
