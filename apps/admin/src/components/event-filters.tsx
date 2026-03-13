"use client";

import { Button, Input, Select, Space } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function EventFilters(props: {
  initialToolName?: string;
  initialDecision?: string;
  initialSeverity?: string;
}) {
  const router = useRouter();
  const [toolName, setToolName] = useState(props.initialToolName ?? "");
  const [decision, setDecision] = useState<string | undefined>(props.initialDecision);
  const [severity, setSeverity] = useState<string | undefined>(props.initialSeverity);

  function applyFilters() {
    const search = new URLSearchParams();
    if (toolName.trim()) {
      search.set("toolName", toolName.trim());
    }
    if (decision) {
      search.set("decision", decision);
    }
    if (severity) {
      search.set("severity", severity);
    }
    router.push(search.size > 0 ? `/events?${search.toString()}` : "/events");
  }

  return (
    <Space wrap size={12}>
      <Input
        value={toolName}
        onChange={(event) => setToolName(event.target.value)}
        placeholder="工具名称，例如 exec"
        style={{ width: 240 }}
      />
      <Select
        value={decision}
        onChange={(value) => setDecision(value)}
        placeholder="处理结果"
        allowClear
        style={{ width: 160 }}
        options={[
          { value: "allow", label: "放行" },
          { value: "alert", label: "告警" },
          { value: "block", label: "阻断" }
        ]}
      />
      <Select
        value={severity}
        onChange={(value) => setSeverity(value)}
        placeholder="风险等级"
        allowClear
        style={{ width: 160 }}
        options={[
          { value: "low", label: "低" },
          { value: "medium", label: "中" },
          { value: "high", label: "高" },
          { value: "critical", label: "严重" }
        ]}
      />
      <Button type="primary" onClick={applyFilters}>
        应用筛选
      </Button>
      <Button onClick={() => router.push("/events")}>重置</Button>
    </Space>
  );
}
