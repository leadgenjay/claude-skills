import unittest
from unittest.mock import Mock, patch

from click.testing import CliRunner

from cli_anything.gohighlevel.gohighlevel_cli import cli
from cli_anything.gohighlevel.utils.form_survey_builder import (
    build_form_payload,
    build_survey_payload,
)


class FormSurveyTypographyTests(unittest.TestCase):
    def test_native_form_defaults_to_inter_and_roboto(self):
        payload = build_form_payload({
            "name": "Lead Magnet",
            "fields": [
                {"kind": "header", "text": "Get the blueprint"},
                {"type": "submit", "tag": "submit", "label": "Send It"},
            ],
        })
        header, button = payload["formData"]["form"]["fields"]
        self.assertEqual((header["fontFamily"], header["weight"]), ("Inter", 700))
        self.assertEqual((button["fontFamily"], button["weight"]), ("Roboto", 700))

    def test_survey_button_defaults_to_roboto(self):
        payload = build_survey_payload({
            "name": "Fit Survey",
            "slides": [{"name": "Start", "button": "Continue", "fields": []}],
        })
        button = payload["formData"]["slides"][0]["button"]
        self.assertEqual((button["fontFamily"], button["weight"]), ("Roboto", 700))


class DestructiveCommandConfirmationTests(unittest.TestCase):
    def setUp(self):
        self.runner = CliRunner()

    def _client_for(self, command):
        client = Mock()
        getattr(client, f"delete_{command}").return_value = True
        return client

    def test_delete_aborts_without_confirmation(self):
        for command in ("form", "survey", "funnel"):
            with self.subTest(command=command):
                client = self._client_for(command)
                with patch(
                    "cli_anything.gohighlevel.gohighlevel_cli._get_internal_client",
                    return_value=client,
                ):
                    result = self.runner.invoke(
                        cli, ["--experimental", f"{command}s", "delete", f"{command}-id"],
                        input="n\n",
                    )
                self.assertEqual(result.exit_code, 1, result.output)
                self.assertIn("Aborted.", result.output)
                getattr(client, f"delete_{command}").assert_not_called()

    def test_delete_runs_after_confirmation_or_yes_flag(self):
        for command, input_text, extra in (
            ("form", "y\n", []),
            ("survey", "", ["--yes"]),
            ("funnel", "", ["-y"]),
        ):
            with self.subTest(command=command):
                client = self._client_for(command)
                with patch(
                    "cli_anything.gohighlevel.gohighlevel_cli._get_internal_client",
                    return_value=client,
                ):
                    result = self.runner.invoke(
                        cli,
                        ["--experimental", f"{command}s", "delete", f"{command}-id", *extra],
                        input=input_text,
                    )
                self.assertEqual(result.exit_code, 0, result.output)
                getattr(client, f"delete_{command}").assert_called_once_with(f"{command}-id")


if __name__ == "__main__":
    unittest.main()
