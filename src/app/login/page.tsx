"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/ui/brand-mark";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const { login, status } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  const handleCredential = async (idToken?: string) => {
    if (!idToken) {
      setErrorMessage("Google 인증을 완료할 수 없습니다.");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const user = await login(idToken);
      toast.show(`${user.name}님, 환영합니다.`, "success");
      router.replace("/");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "로그인 실패";
      setErrorMessage(message);
      toast.show(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#121212] px-5 py-10">
      <BackgroundFlare />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8">
        <BrandMark size="lg" asLink={false} />
        <div
          className="w-full rounded-2xl bg-[#181818] p-8 sm:p-10"
          style={{ boxShadow: "var(--shadow-heavy)" }}
        >
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-[28px] font-bold tracking-tight text-white">
              로그인
            </h1>
            <p className="text-[14px] text-[#b3b3b3]">
              Google 계정으로 ZH Nexus 콘솔에 접속하세요.
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="w-full">
              {submitting ? (
                <div className="flex h-12 items-center justify-center rounded-full bg-[#1f1f1f] text-[14px] font-bold uppercase tracking-[1.4px] text-[#b3b3b3]">
                  <span
                    aria-hidden
                    style={{ animation: "zh-spin 0.75s linear infinite" }}
                    className="mr-3 h-4 w-4 rounded-full border-2 border-[#b3b3b3] border-t-[#1ed760]"
                  />
                  인증 중…
                </div>
              ) : (
                <div className="flex justify-center [&_>div]:w-full">
                  <GoogleLogin
                    onSuccess={(res) => handleCredential(res.credential)}
                    onError={() =>
                      setErrorMessage("Google 인증이 취소되었습니다.")
                    }
                    theme="filled_black"
                    shape="pill"
                    size="large"
                    text="continue_with"
                    width="340"
                  />
                </div>
              )}
            </div>

            {errorMessage ? (
              <p
                role="alert"
                className="text-center text-[13px] font-medium text-[#f3727f]"
              >
                {errorMessage}
              </p>
            ) : null}
          </div>
        </div>
        <p className="text-center text-[12px] leading-relaxed text-[#7c7c7c]">
          최초 로그인 시 관리자 승인 후 기능을 이용할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

function BackgroundFlare() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#1ed760] opacity-[0.07] blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-150px] right-[-80px] h-[320px] w-[320px] rounded-full bg-[#539df5] opacity-[0.08] blur-[120px]"
      />
    </>
  );
}
