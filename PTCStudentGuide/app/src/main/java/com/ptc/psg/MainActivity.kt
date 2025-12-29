package com.ptc.psg

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.ImageButton
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.GravityCompat
import androidx.drawerlayout.widget.DrawerLayout
import androidx.fragment.app.Fragment
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.auth.api.identity.SignInClient
import com.google.firebase.auth.FirebaseAuth
import com.google.android.material.navigation.NavigationView
import com.bumptech.glide.Glide
import com.ptc.psg.ui.chat.ChatFragment
import com.ptc.psg.ui.contact.ContactFragment
import com.ptc.psg.ui.home.HomeFragment
import de.hdodenhof.circleimageview.CircleImageView // optional: use a circle image view library

class MainActivity : AppCompatActivity() {

    private lateinit var drawerLayout: DrawerLayout
    private lateinit var navigationView: NavigationView

    private val homeFragment = HomeFragment()
    private val chatFragment = ChatFragment()
    private val contactFragment = ContactFragment()

    private lateinit var auth: FirebaseAuth
    private lateinit var oneTapClient: SignInClient

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        auth = FirebaseAuth.getInstance()
        oneTapClient = Identity.getSignInClient(this)

        drawerLayout = findViewById(R.id.drawerLayout)
        navigationView = findViewById(R.id.navigationView)

        // Default fragment
        if (savedInstanceState == null) {
            supportFragmentManager.beginTransaction()
                .add(R.id.fragmentContainer, homeFragment, "HOME")
                .add(R.id.fragmentContainer, chatFragment, "CHAT").hide(chatFragment)
                .add(R.id.fragmentContainer, contactFragment, "CONTACT").hide(contactFragment)
                .commit()
        }

        // Navigation drawer item click
        navigationView.setNavigationItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_home -> showFragment("HOME")
                R.id.nav_chat -> showFragment("CHAT")
                R.id.nav_contact -> showFragment("CONTACT")
                R.id.nav_logout -> performLogout()
            }
            drawerLayout.closeDrawers()
            true
        }

        // Open drawer button
        findViewById<ImageButton>(R.id.menuButton).setOnClickListener {
            drawerLayout.openDrawer(GravityCompat.START)
        }

        // Setup drawer header
        setupDrawerHeader()
    }

    private fun showFragment(tag: String) {
        val fm = supportFragmentManager
        fm.beginTransaction().apply {
            fm.fragments.forEach { hide(it) }
            fm.findFragmentByTag(tag)?.let { show(it) }
        }.commit()
    }

    fun navigateToChat() {
        navigationView.setCheckedItem(R.id.nav_chat)
        showFragment("CHAT")
    }

    private fun setupDrawerHeader() {
        val headerView = navigationView.getHeaderView(0)

        val userNameText = headerView.findViewById<TextView>(R.id.userNameText)
        val userEmailText = headerView.findViewById<TextView>(R.id.userEmailText)

        // Load user info from Firebase Auth
        val currentUser = auth.currentUser
        userNameText.text = currentUser?.displayName ?: "Juan Dela Cruz"
        userEmailText.text = currentUser?.email ?: "student@ptc.edu.ph"

    }


    private fun performLogout() {
        // 1️⃣ Sign out from Firebase
        auth.signOut()

        // 2️⃣ Sign out from Google One Tap
        oneTapClient.signOut().addOnCompleteListener {
            // Optional: you can add any cleanup here if needed
        }

        // 3️⃣ Clear drawer header
        clearDrawerHeader()

        // 4️⃣ Go back to LoginActivity
        startActivity(Intent(this, LoginActivity::class.java))
        finish() // prevent back navigation
    }

    private fun clearDrawerHeader() {
        val headerView = navigationView.getHeaderView(0)
        headerView.findViewById<TextView>(R.id.userNameText).text = ""
        headerView.findViewById<TextView>(R.id.userEmailText).text = ""
    }
}
