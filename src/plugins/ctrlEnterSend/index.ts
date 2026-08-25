/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs, IS_MAC } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    submitRule: {
        description: "The way to send a message",
        type: OptionType.SELECT,
        options: [
            {
                label: "Ctrl+Enter (Enter or Shift+Enter for new line) (Cmd+Enter on macOS)",
                value: "ctrl+enter",
                default: true
            },
            {
                label: "Shift+Enter (Enter for new line)",
                value: "shift+enter"
            },
            {
                label: "Enter (Shift+Enter for new line; Discord default)",
                value: "enter"
            }
        ]
    },
    sendMessageInTheMiddleOfACodeBlock: {
        description: "Whether to send a message in the middle of a code block",
        type: OptionType.BOOLEAN,
        default: true,
    }
});

export default definePlugin({
    name: "CtrlEnterSend",
    authors: [Devs.UlyssesZhan],
    description: "Use Ctrl+Enter to send messages and Enter to insert a new line (customizable)",
    tags: ["Shortcuts", "Chat"],
    settings,

    patches: [
        // Rich chat editor (current Discord)
        {
            find: ".selectPreviousCommandOption(",
            replacement: {
                match: /(?<=(\i)\.key!==\i\.\i.ENTER\|\|).{0,100}(\(0,\i\.\i\)\(\i\)).{0,100}(?=\|\|\(\i\.preventDefault)/,
                replace: "!$self.shouldSubmit($1,$2)"
            }
        },
        // Legacy plaintext textarea
        {
            find: "!this.hasOpenCodeBlock()",
            replacement: {
                match: /!(\i).shiftKey&&!(this.hasOpenCodeBlock\(\))&&\(.{0,100}?\)/,
                replace: "$self.shouldSubmit($1, $2)"
            }
        },
        // Fallback: make main chat inputs behave like mobile (Enter = newline, Ctrl+Enter = send)
        {
            find: 'analyticsName:"normal"',
            replacement: [
                {
                    match: /disableEnterToSubmit:\i\.\i/g,
                    replace: "disableEnterToSubmit:$self.shouldDisableEnterToSubmit()"
                },
                {
                    match: /(analyticsName:"edit".{0,400}?submit:\{)/,
                    replace: "$1disableEnterToSubmit:$self.shouldDisableEnterToSubmit(),"
                }
            ]
        }
    ],

    shouldDisableEnterToSubmit() {
        return settings.store.submitRule !== "enter";
    },

    shouldSubmit(event: KeyboardEvent, codeblock: boolean): boolean {
        let result = false;
        switch (settings.store.submitRule) {
            case "shift+enter":
                result = event.shiftKey;
                break;
            case "ctrl+enter":
                result = IS_MAC ? event.metaKey : event.ctrlKey;
                break;
            case "enter":
                result = !event.shiftKey && !event.ctrlKey && !event.metaKey;
                break;
        }
        if (!settings.store.sendMessageInTheMiddleOfACodeBlock)
            result &&= !codeblock;
        return result;
    }
});
