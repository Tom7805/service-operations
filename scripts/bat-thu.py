# -*- coding: utf-8 -*-
"""May chu thu cuc bo de THU chuc nang gui thu, khong can Docker hay tai khoan SMTP.

Chay:
    python scripts/bat-thu.py

Roi khoi dong backend voi:
    SMTP_HOST=localhost SMTP_PORT=1025 SMTP_AUTH=false SMTP_STARTTLS=false \
    MAIL_FROM=no-reply@vanhanhdichvu.local ./mvnw spring-boot:run

Moi la thu backend gui se hien ngay tren man hinh nay, kem lien ket khoi phuc.

Vi sao tu viet thay vi dung MailHog: MailHog chay bang Docker, ma Docker Desktop
tren may nay dang khong chay. Script nay chi dung thu vien co san cua Python,
khong cai them gi.

KHONG dung cho moi truong that — no khong ma hoa, khong xac thuc, va in nguyen
noi dung thu ra man hinh.
"""
import asyncio
import base64
import email
import quopri
import re
import sys
from datetime import datetime
from email.header import decode_header

HOST, PORT = "127.0.0.1", 1025

# Console Windows mac dinh la cp1252, khong in duoc chu tieng Viet — ma toan bo
# noi dung thu deu la tieng Viet. Ep dau ra sang UTF-8 ngay tu dau.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # noqa: BLE001 - moi truong khong ho tro thi thoi
    pass


class PhienSmtp(asyncio.Protocol):
    """Cai dat toi thieu du de mot may khach SMTP gui duoc thu."""

    def connection_made(self, transport):
        self.transport = transport
        self.buffer = b""
        self.dang_nhan_du_lieu = False
        self.du_lieu = []
        transport.write(b"220 bat-thu.local May chu thu cuc bo\r\n")

    def data_received(self, data):
        self.buffer += data
        while b"\r\n" in self.buffer:
            dong, self.buffer = self.buffer.split(b"\r\n", 1)
            self._xu_ly(dong.decode("utf-8", "replace"))

    def _xu_ly(self, dong):
        if self.dang_nhan_du_lieu:
            if dong == ".":
                self.dang_nhan_du_lieu = False
                noi_dung = "\n".join(self.du_lieu)
                self.du_lieu = []
                # TRA LOI TRUOC, IN SAU — va boc try/except quanh phan in.
                #
                # Ban dau thu tu nguoc lai, va no gay ra mot loi that: `print()`
                # nem UnicodeEncodeError khi gap chu tieng Viet tren console
                # cp1252 cua Windows, nen dong `250 OK` khong bao gio duoc gui.
                # May khach SMTP cho mai -> luong xu ly cua BACKEND treo theo ->
                # request HTTP treo luon. Mot cong cu do khong bao gio duoc phep
                # lam treo thu ma no dang do.
                self.transport.write(b"250 OK da nhan\r\n")
                try:
                    self._in_thu(noi_dung)
                except Exception as loi:  # noqa: BLE001 - cong cu do, khong duoc chet
                    print("  [khong in duoc noi dung thu: %s]" % loi)
            else:
                # SMTP quy dinh dau cham dau dong bi nhan doi khi truyen
                self.du_lieu.append(dong[1:] if dong.startswith("..") else dong)
            return

        lenh = dong.upper()
        if lenh.startswith(("HELO", "EHLO")):
            # Khong quang cao STARTTLS/AUTH — backend phai dat SMTP_AUTH=false,
            # SMTP_STARTTLS=false thi moi khop.
            self.transport.write(b"250-bat-thu.local xin chao\r\n250 SIZE 10485760\r\n")
        elif lenh.startswith(("MAIL FROM", "RCPT TO")):
            self.transport.write(b"250 OK\r\n")
        elif lenh == "DATA":
            self.dang_nhan_du_lieu = True
            self.transport.write(b"354 Moi gui noi dung, ket thuc bang mot dong chi co dau cham\r\n")
        elif lenh == "QUIT":
            self.transport.write(b"221 Tam biet\r\n")
            self.transport.close()
        elif lenh == "RSET":
            self.du_lieu = []
            self.transport.write(b"250 OK\r\n")
        else:
            self.transport.write(b"250 OK\r\n")

    def _in_thu(self, noi_dung):
        """Giai ma dung nhu mot trinh doc thu that lam, roi in ra.

        Neu chi in nguyen chuoi tho thi chu tieng Viet hien ra dang `L=C3=BD` va
        rat de ket luan nham la "gui thu lam hong tieng Viet", trong khi thuc te
        do chi la ma hoa quoted-printable ma moi trinh doc thu deu giai duoc.
        Cong cu do phai giai ma giong noi nhan, neu khong chinh no se sinh ra ket
        luan sai.
        """
        # Tach phan dau va phan than
        if "\n\n" in noi_dung:
            phan_dau, than = noi_dung.split("\n\n", 1)
        else:
            phan_dau, than = noi_dung, ""

        headers = email.message_from_string(phan_dau)
        charset = headers.get_content_charset() or "utf-8"
        ma_hoa = (headers.get("Content-Transfer-Encoding") or "").lower()

        if ma_hoa == "quoted-printable":
            than = quopri.decodestring(than.encode("ascii", "replace")).decode(charset, "replace")
        elif ma_hoa == "base64":
            than = base64.b64decode(than).decode(charset, "replace")

        gio = datetime.now().strftime("%H:%M:%S")
        print("\n" + "=" * 74)
        print("  DA NHAN MOT LA THU  --  %s" % gio)
        print("=" * 74)
        for ten in ("From", "To", "Subject"):
            gia_tri = headers.get(ten)
            if gia_tri:
                # Tieu de co the duoc ma hoa RFC 2047 (=?UTF-8?...?=)
                phan = decode_header(gia_tri)
                doc_duoc = "".join(
                    (p.decode(c or "utf-8", "replace") if isinstance(p, bytes) else p)
                    for p, c in phan
                )
                print("  %-9s %s" % (ten + ":", doc_duoc))
        print("  %-9s %s" % ("Charset:", charset))
        print("  %-9s %s" % ("Ma hoa:", ma_hoa or "(khong)"))
        print("-" * 74)
        for dong in than.strip().split("\n"):
            print("  " + dong)
        lien_ket = re.findall(r"https?://\S+", than)
        if lien_ket:
            print("-" * 74)
            print("  LIEN KET KHOI PHUC (dan vao trinh duyet):")
            for lk in lien_ket:
                print("  --> " + lk)
        print("=" * 74 + "\n")
        sys.stdout.flush()


async def main():
    server = await asyncio.get_running_loop().create_server(PhienSmtp, HOST, PORT)
    print("May chu thu cuc bo dang nghe tai %s:%d" % (HOST, PORT))
    print("Khoi dong backend voi SMTP_HOST=localhost SMTP_PORT=1025")
    print("SMTP_AUTH=false SMTP_STARTTLS=false MAIL_FROM=no-reply@vanhanhdichvu.local")
    print("Nhan Ctrl+C de dung.\n")
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nDa dung.")
