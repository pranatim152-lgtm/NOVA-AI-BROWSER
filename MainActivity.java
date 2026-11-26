package com.nova.browser;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import android.view.ViewGroup;
import android.view.KeyEvent;
import android.view.inputmethod.EditorInfo;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;

public class MainActivity extends Activity {
    private final ArrayList<WebView> tabs = new ArrayList<>();
    private int active = -1;
    private LinearLayout root, tabBar;
    private EditText address;
    private LinearLayout pages;
    private int ink = Color.rgb(17, 24, 39), accent = Color.rgb(104, 85, 220);

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(ink);
        getWindow().setNavigationBarColor(Color.BLACK);
        root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setBackgroundColor(ink);
        LinearLayout nav = new LinearLayout(this); nav.setPadding(8, 8, 8, 8); nav.setBackgroundColor(ink);
        Button back = button("‹"), forward = button("›"), reload = button("↻"), add = button("+");
        address = new EditText(this); address.setSingleLine(true); address.setTextColor(Color.WHITE); address.setHintTextColor(0xffaaaaaa); address.setHint("Search or enter website"); address.setTextSize(14); address.setPadding(14, 0, 14, 0); address.setBackgroundColor(0xff293047);
        nav.addView(back, new LinearLayout.LayoutParams(42, 46)); nav.addView(forward, new LinearLayout.LayoutParams(42, 46)); nav.addView(address, new LinearLayout.LayoutParams(0, 46, 1)); nav.addView(reload, new LinearLayout.LayoutParams(42, 46)); nav.addView(add, new LinearLayout.LayoutParams(42, 46)); root.addView(nav);
        tabBar = new LinearLayout(this); tabBar.setOrientation(LinearLayout.HORIZONTAL); root.addView(tabBar, new LinearLayout.LayoutParams(-1, 42));
        pages = new LinearLayout(this); pages.setOrientation(LinearLayout.VERTICAL); root.addView(pages, new LinearLayout.LayoutParams(-1, 0, 1));
        LinearLayout footer = new LinearLayout(this); footer.setPadding(8, 5, 8, 5); footer.setBackgroundColor(ink);
        Button home = button("Home"), ai = button("Ask NOVA AI"), tabsBtn = button("Tabs"); footer.addView(home, new LinearLayout.LayoutParams(0, 42, 1)); footer.addView(ai, new LinearLayout.LayoutParams(0, 42, 1)); footer.addView(tabsBtn, new LinearLayout.LayoutParams(0, 42, 1)); root.addView(footer);
        setContentView(root);
        back.setOnClickListener(v -> { if (current()!=null && current().canGoBack()) current().goBack(); });
        forward.setOnClickListener(v -> { if (current()!=null && current().canGoForward()) current().goForward(); });
        reload.setOnClickListener(v -> { if (current()!=null) current().reload(); });
        add.setOnClickListener(v -> newTab("https://duckduckgo.com"));
        home.setOnClickListener(v -> navigate("https://duckduckgo.com"));
        ai.setOnClickListener(v -> navigate("https://chatgpt.com"));
        tabsBtn.setOnClickListener(v -> { if (tabs.size()>1) { int next=(active+1)%tabs.size(); activate(next); } else newTab("https://duckduckgo.com"); });
        address.setOnEditorActionListener((v, action, event) -> { if(action==EditorInfo.IME_ACTION_GO || action==EditorInfo.IME_ACTION_SEARCH || (event!=null && event.getKeyCode()==KeyEvent.KEYCODE_ENTER)){ navigate(toUrl(address.getText().toString())); return true;} return false; });
        newTab("https://duckduckgo.com");
    }
    private Button button(String label) { Button b=new Button(this); b.setText(label); b.setTextColor(Color.WHITE); b.setAllCaps(false); b.setTextSize(13); b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xff293047)); return b; }
    private WebView current() { return active>=0 && active<tabs.size()?tabs.get(active):null; }
    private void newTab(String url) {
        WebView web = new WebView(this); WebSettings s=web.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setAllowFileAccess(false); s.setAllowContentAccess(false); s.setSupportMultipleWindows(false); s.setSafeBrowsingEnabled(true); s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.setWebViewClient(new WebViewClient(){ @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req){ Uri u=req.getUrl(); String scheme=u.getScheme(); if ("http".equalsIgnoreCase(scheme)||"https".equalsIgnoreCase(scheme)) return false; if ("mailto".equalsIgnoreCase(scheme)||"tel".equalsIgnoreCase(scheme)) { try { startActivity(new Intent(Intent.ACTION_VIEW,u)); } catch(Exception ignored){} return true;} return true; } @Override public void onPageFinished(WebView view,String url){ if(view==current()) address.setText(url); }});
        web.setWebChromeClient(new WebChromeClient()); web.setVisibility(View.GONE); pages.addView(web,new LinearLayout.LayoutParams(-1,-1)); tabs.add(web); activate(tabs.size()-1); web.loadUrl(url);
    }
    private void activate(int index){ if(index<0||index>=tabs.size()) return; if(current()!=null) current().setVisibility(View.GONE); active=index; current().setVisibility(View.VISIBLE); address.setText(current().getUrl()); tabBar.removeAllViews(); for(int i=0;i<tabs.size();i++){ final int n=i; Button t=button((i==active?"● ":"")+ (i+1)+"  ×"); t.setOnClickListener(v->{ if(n==active){ closeTab(n); } else activate(n); }); tabBar.addView(t,new LinearLayout.LayoutParams(0,42,1)); }}
    private void closeTab(int index){ if(tabs.size()==1){ current().loadUrl("https://duckduckgo.com"); return;} WebView w=tabs.remove(index); pages.removeView(w); w.stopLoading(); w.destroy(); if(index<=active) active=Math.max(0,active-1); activate(active); }
    private void navigate(String url){ if(current()!=null) current().loadUrl(url); }
    private String toUrl(String raw){ String q=raw.trim(); if(q.isEmpty()) return "https://duckduckgo.com"; if(q.matches("(?i)^https?://.*")) return q; if(q.matches("(?i)^[a-z0-9.-]+\\.[a-z]{2,}(:[0-9]+)?(/.*)?$")) return "https://"+q; try{return "https://duckduckgo.com/?q="+URLEncoder.encode(q, StandardCharsets.UTF_8.name());}catch(Exception e){return "https://duckduckgo.com";} }
    @Override public void onBackPressed(){ if(current()!=null && current().canGoBack()) current().goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy(){ for(WebView w:tabs){w.stopLoading();w.destroy();} tabs.clear(); super.onDestroy(); }
}
