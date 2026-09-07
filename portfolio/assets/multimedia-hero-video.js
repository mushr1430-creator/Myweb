(() => {
  const hero = document.querySelector(".multimedia-project .project_hero_img");
  if (!hero || hero.querySelector(".multimedia-hero-video-launch")) return;

  const source = "/assets/multimedia-design-intro.mp4";
  const landscapeSource = "/assets/multimedia-design-landscape.mp4";
  const poster = "/assets/framia-home-portrait.png";

  const launch = document.createElement("button");
  launch.className = "multimedia-hero-video-launch";
  launch.type = "button";
  launch.setAttribute("aria-label", "全屏播放 Multimedia Design 视频并开启声音");
  launch.innerHTML = `
    <video class="multimedia-hero-video-preview" src="${source}" poster="${poster}" muted loop autoplay playsinline preload="metadata" aria-hidden="true"></video>
    <span class="multimedia-hero-video-label">Fullscreen · Sound on</span>
  `;
  hero.appendChild(launch);

  const landscapeVideo = document.querySelector(".multimedia-landscape-video");
  const landscapeShell = landscapeVideo?.closest(".project_row_hero_media");
  if (landscapeVideo && landscapeShell && !landscapeShell.querySelector(".multimedia-landscape-video-launch")) {
    landscapeVideo.defaultMuted = true;
    landscapeVideo.muted = true;
    landscapeVideo.setAttribute("playsinline", "");

    const landscapeLaunch = document.createElement("button");
    landscapeLaunch.className = "multimedia-landscape-video-launch";
    landscapeLaunch.type = "button";
    landscapeLaunch.setAttribute("aria-label", "全屏播放 Multimedia Design 横屏视频并开启声音");
    landscapeLaunch.innerHTML = '<span class="multimedia-landscape-video-label">Fullscreen · Sound on</span>';
    landscapeShell.appendChild(landscapeLaunch);
  }

  const modal = document.createElement("div");
  modal.className = "multimedia-video-modal";
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Multimedia Design 全屏视频");
  modal.innerHTML = `
    <video class="multimedia-video-modal-video" src="${source}" playsinline preload="metadata" controls></video>
    <button class="multimedia-video-close" type="button" aria-label="退出全屏视频">Exit</button>
  `;
  document.body.appendChild(modal);

  const previewVideo = launch.querySelector("video");
  const modalVideo = modal.querySelector("video");
  const closeButton = modal.querySelector("button");
  let isOpen = false;
  let activeTrigger = launch;
  let activePreview = previewVideo;
  let resumePreview = true;

  const currentLaunch = () => document.querySelector(".multimedia-hero-video-launch") || launch;
  const currentPreview = () => currentLaunch().querySelector(".multimedia-hero-video-preview") || previewVideo;

  previewVideo.defaultMuted = true;
  previewVideo.muted = true;
  previewVideo.play().catch(() => {});

  const finishClose = () => {
    if (!isOpen) return;
    isOpen = false;
    modalVideo.pause();
    modalVideo.currentTime = 0;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("multimedia-video-open");
    if (activePreview && resumePreview) activePreview.play().catch(() => {});
    activeTrigger?.focus({ preventScroll: true });
  };

  const closeModal = () => {
    if (!isOpen) return;
    finishClose();
  };

  const openModal = (requestedSource, trigger, preview) => {
    if (isOpen) return;
    isOpen = true;
    activeTrigger = trigger || currentLaunch();
    activePreview = preview || currentPreview();
    resumePreview = activePreview ? !activePreview.paused : false;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("multimedia-video-open");
    activePreview?.pause();
    if (modalVideo.getAttribute("src") !== requestedSource) {
      modalVideo.setAttribute("src", requestedSource);
      modalVideo.load();
    }
    modalVideo.currentTime = 0;
    modalVideo.muted = false;
    modalVideo.volume = 1;

    modalVideo.play().catch(() => {});
    closeButton.focus({ preventScroll: true });
  };

  launch.addEventListener("click", () => openModal(source, currentLaunch(), currentPreview()));
  document.addEventListener("click", (event) => {
    const heroTrigger = event.target.closest?.(".multimedia-hero-video-launch");
    if (heroTrigger) {
      openModal(source, heroTrigger, heroTrigger.querySelector(".multimedia-hero-video-preview"));
      return;
    }

    const landscapeTrigger = event.target.closest?.(".multimedia-landscape-video-launch");
    if (landscapeTrigger) {
      const shell = landscapeTrigger.closest(".project_row_hero_media");
      openModal(landscapeSource, landscapeTrigger, shell?.querySelector(".multimedia-landscape-video"));
    }
  }, true);
  closeButton.addEventListener("click", closeModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen) closeModal();
  });
})();
