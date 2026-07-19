import unittest

from cli_anything.gohighlevel.utils.landing_page_design import (
    apply_design_system,
    lint_spec,
    template_spec,
)


class LandingPageDesignRegressionTests(unittest.TestCase):
    def test_logo_gets_explicit_runtime_centering_and_rhythm(self):
        source = {"designSystem": {"theme": "modern"}, "sections": [{"rows": [{
            "columns": [{"elements": [
                {"type": "image", "url": "https://example.test/brand-logo.png", "alt": "Brand logo"},
                {"type": "subHeading", "text": "Separated heading"},
            ]}],
        }]}]}

        result = apply_design_system(source)
        logo = result["sections"][0]["rows"][0]["columns"][0]["elements"][0]

        self.assertEqual(logo["role"], "logo")
        self.assertEqual(logo["align"], "center")
        self.assertGreaterEqual(logo["marginBottom"], 24)
        self.assertIn("lp-logo", logo["customClass"])
        self.assertIn(".lp-logo img", result["customCss"])

    def test_native_survey_footer_css_contains_geometry_guards(self):
        result = apply_design_system({
            "designSystem": {"theme": "modern"},
            "sections": [{"rows": [{"columns": [{"customClass": ["lp-form-card"], "elements": [
                {"type": "survey", "surveyId": "survey-id"},
            ]}]}]}],
        })

        css = result["customCss"]
        self.assertIn(".lp-form-card .ghl-footer{height:76px!important", css)
        self.assertIn(".lp-form-card .ghl-btn-placeholder{display:none!important}", css)
        self.assertIn(".lp-form-card .ghl-footer-back,.hl_page-preview--content .lp-form-card .ghl-footer-next", css)

    def test_lint_rejects_collapsed_media_and_redundant_calendar_jump(self):
        spec = {
            "designSystem": False,
            "sections": [
                {"rows": [{"columns": [{"elements": [
                    {"type": "heading", "text": "Choose your call"},
                    {"type": "image", "url": "https://example.test/logo.png", "alt": "Brand logo", "align": "left", "marginBottom": 0},
                    {"type": "customCode", "role": "video", "html": '<div class="video-placeholder">Video</div>', "marginBottom": 0},
                    {"type": "button", "text": "Choose my time", "action": "scroll-to-element", "scrollToElement": "booking-calendar"},
                ]}]}]},
                {"id": "booking-calendar", "rows": [{"columns": [{"elements": [
                    {"type": "calendar", "calendarId": "calendar-id"},
                ]}]}]},
            ],
        }

        codes = {issue["code"] for issue in lint_spec(spec)["issues"]}
        self.assertIn("spacing.element-collapse", codes)
        self.assertIn("media.logo-center", codes)
        self.assertIn("cta.calendar-redundant", codes)

    def test_calendar_template_uses_calendar_as_primary_action(self):
        spec = template_spec("calendar")
        buttons = [
            element
            for section in spec["sections"]
            for row in section.get("rows", [])
            for column in row.get("columns", [])
            for element in column.get("elements", [])
            if element.get("type") == "button"
        ]
        codes = {issue["code"] for issue in lint_spec(spec)["issues"]}

        self.assertEqual(buttons, [])
        self.assertNotIn("hero.cta", codes)
        self.assertNotIn("cta.calendar-redundant", codes)


if __name__ == "__main__":
    unittest.main()
