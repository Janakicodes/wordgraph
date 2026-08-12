{pkgs}: {
  deps = [
    pkgs.chromium
    pkgs.at-spi2-core
    pkgs.dbus
    pkgs.libdrm
    pkgs.expat
    pkgs.mesa
    pkgs.xorg.libXrender
    pkgs.xorg.libxcb
    pkgs.xorg.libXrandr
    pkgs.xorg.libXfixes
    pkgs.xorg.libXext
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
    pkgs.xorg.libX11
    pkgs.alsa-lib
    pkgs.cairo
    pkgs.pango
    pkgs.cups
    pkgs.at-spi2-atk
    pkgs.atk
    pkgs.nspr
    pkgs.nss
    pkgs.glib
  ];
}
