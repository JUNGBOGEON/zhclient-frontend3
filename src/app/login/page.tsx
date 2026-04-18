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
    <div className="flex min-h-screen items-center justify-center bg-[#121212] px-5 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <BrandMark size="md" asLink={false} />
        <div className="w-full rounded-md border border-[#272727] bg-[#181818] p-6">
          <h1 className="text-[18px] font-semibold text-white">로그인</h1>
          <p className="mt-1 text-[13px] text-[#b3b3b3]">
            Google 계정으로 계속 진행합니다.
          </p>

          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="w-full">
              {submitting ? (
                <div className="flex h-10 items-center justify-center rounded-md bg-[#1f1f1f] text-[13px] text-[#b3b3b3]">
                  <span
                    aria-hidden
                    style={{ animation: "zh-spin 0.75s linear infinite" }}
                    className="mr-2 h-3.5 w-3.5 rounded-full border-2 border-[#b3b3b3] border-t-[#1ed760]"
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
                    shape="rectangular"
                    size="large"
                    text="continue_with"
                    width="320"
                  />
                </div>
              )}
            </div>

            {errorMessage ? (
              <p role="alert" className="text-[13px] text-[#f3727f]">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
